# Generated by Django 3.0.7 on 2020-07-02 07:43

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [("data_browser", "0007_view_public_slug")]

    operations = [
        migrations.AddField(
            model_name="view", name="limit", field=models.IntegerField(default=1000)
        )
    ]