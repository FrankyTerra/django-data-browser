import json

from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404

from .common import HttpResponse, JsonResponse, can_make_public
from .models import View, global_data


def deserialize(request):
    data = json.loads(request.body)
    if "model" in data:
        data["model_name"] = data.pop("model")

    res = {
        f: data[f]
        for f in [
            "name",
            "description",
            "public",
            "model_name",
            "fields",
            "query",
            "limit",
        ]
        if f in data
    }

    if "limit" in res:
        try:
            res["limit"] = int(res["limit"])
        except:  # noqa: E722  input sanitization
            res["limit"] = 1
        if res["limit"] < 1:
            res["limit"] = 1

    if not can_make_public(request.user):
        res["public"] = False

    return res


def serialize(view):
    return {
        "name": view.name,
        "description": view.description,
        "public": view.public,
        "model": view.model_name,
        "fields": view.fields,
        "query": view.query,
        "limit": view.limit,
        "publicLink": view.public_link(),
        "googleSheetsFormula": view.google_sheets_formula(),
        "link": f"/query/{view.model_name}/{view.fields}.html?{view.query}&limit={view.limit}",
        "createdTime": f"{view.created_time:%Y-%m-%d %H:%M:%S}",
        "pk": view.pk,
    }


def get_queryset(request):
    return View.objects.filter(owner=request.user)


@login_required
def view_list(request):
    global_data.request = request

    if request.method == "GET":
        return JsonResponse(
            [
                serialize(view)
                for view in get_queryset(request).order_by("name", "created_time")
            ]
        )
    elif request.method == "POST":
        view = View.objects.create(owner=request.user, **deserialize(request))
        try:
            from reports.models import ManualReport
            from django.contrib.contenttypes.models import ContentType
            from .orm_results import get_result_queryset, _rows_sub_query, _cols_sub_query
            from .orm_admin import get_models
            from .query import BoundQuery

            app, model_name = view.model_name.split('.')
            ct = ContentType.objects.get(app_label=app.lower(), model=model_name.lower())
            orm_models = get_models(request)
            bound_query = BoundQuery.bind(view.get_query(), orm_models)

            if bound_query.bound_col_fields and bound_query.bound_row_fields:
                res = get_result_queryset(request, bound_query, orm_models)
                rows_res = get_result_queryset(request, _rows_sub_query(bound_query), orm_models)

                cols_res = get_result_queryset(request, _cols_sub_query(bound_query), orm_models)
            else:
                res = get_result_queryset(request, bound_query, orm_models)

            query = res.query

            report = ManualReport.objects.update_or_create(
                name=view.name,
                main_model=ct,
                defaults={
                    'sql': str(query),
                    'public': True,
                }
            )
        except Exception as e:
            pass
        return JsonResponse(serialize(view))
    else:
        return HttpResponse(status=400)


@login_required
def view_detail(request, pk):
    global_data.request = request
    view = get_object_or_404(get_queryset(request), pk=pk)

    if request.method == "GET":
        return JsonResponse(serialize(view))
    elif request.method == "PATCH":
        for k, v in deserialize(request).items():
            setattr(view, k, v)
        view.save()
        try:
            from reports.models import ManualReport
            from django.contrib.contenttypes.models import ContentType
            from .orm_results import get_result_queryset, _rows_sub_query, _cols_sub_query
            from .orm_admin import get_models
            from .query import BoundQuery

            app, model_name = view.model_name.split('.')
            ct = ContentType.objects.get(app_label=app.lower(), model=model_name.lower())
            orm_models = get_models(request)
            bound_query = BoundQuery.bind(view.get_query(), orm_models)

            if bound_query.bound_col_fields and bound_query.bound_row_fields:
                res = get_result_queryset(request, bound_query, orm_models)
                rows_res = get_result_queryset(request, _rows_sub_query(bound_query), orm_models)

                cols_res = get_result_queryset(request, _cols_sub_query(bound_query), orm_models)
            else:
                res = get_result_queryset(request, bound_query, orm_models)

            query = res.query

            report = ManualReport.objects.update_or_create(
                name=view.name,
                main_model=ct,
                defaults={
                    'sql': str(query),
                }
            )
        except Exception as e:
            pass
        return JsonResponse(serialize(view))
    elif request.method == "DELETE":
        view.delete()
        return HttpResponse(status=204)
    else:
        return HttpResponse(status=400)
