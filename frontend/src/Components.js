import React from "react";
import { Link, useParams, useHistory } from "react-router-dom";
import { TLink, SLink, useData, version, Save, Delete, CopyText } from "./Util";
import { Results } from "./Results";
import { getPartsForQuery } from "./Query";
import logo from "../public/images/logo.png";
import "./App.css";

function FilterValue(props) {
  const { lookup, onChange, value, field } = props;
  const onChangeEvent = (e) => onChange(e.target.value);
  if (props.lookup.type === "boolean")
    return (
      <select {...{ value }} onChange={onChangeEvent} className="FilterValue">
        <option value={true}>true</option>
        <option value={false}>false</option>
      </select>
    );
  else if (lookup.type === "weekday")
    return (
      <select {...{ value }} onChange={onChangeEvent} className="FilterValue">
        {[
          "Воскресенье",
          "Понедельник",
          "Вторник",
          "Среда",
          "Четверг",
          "Пятница",
          "Суббота",
        ].map((weekday) => (
          <option value={weekday}>{weekday}</option>
        ))}
      </select>
    );
  else if (lookup.type === "month")
    return (
      <select {...{ value }} onChange={onChangeEvent} className="FilterValue">
        {[
          "Январь",
          "Февраль",
          "Март",
          "Апрель",
          "Май",
          "Июнь",
          "Июль",
          "Август",
          "Сентябрь",
          "Октябрь",
          "Ноябрь",
          "Декабрь",
        ].map((month) => (
          <option value={month}>{month}</option>
        ))}
      </select>
    );
  else if (
    field.choices.length &&
    (lookup.type === "numberchoice" || lookup.type === "stringchoice")
  )
    return (
      <select {...{ value }} onChange={onChangeEvent} className="FilterValue">
        {field.choices.map(([option, label]) => (
          <option value={option}>{label}</option>
        ))}
      </select>
    );
  else if (
    lookup.type === "number" ||
    lookup.type === "numberchoice" ||
    lookup.type === "year"
  )
    return (
      <input
        {...{ value }}
        onChange={onChangeEvent}
        className="FilterValue"
        type="number"
        step="0"
      />
    );
  else if (lookup.type === "jsonfield") {
    const parts = value.split(/\|(.*)/);
    return (
      <>
        <input
          value={parts[0]}
          onChange={(e) => onChange(`${e.target.value}|${parts[1]}`)}
          className="FilterValue Half"
          type="text"
        />
        <input
          value={parts[1]}
          onChange={(e) => onChange(`${parts[0]}|${e.target.value}`)}
          className="FilterValue Half"
          type="text"
        />
      </>
    );
  } else
    return (
      <input
        {...{ value }}
        onChange={onChangeEvent}
        className="FilterValue"
        type="text"
      />
    );
}

class Filter extends React.Component {
  render() {
    const {
      path,
      prettyPath,
      index,
      lookup,
      query,
      value,
      errorMessage,
    } = this.props;
    const field = query.getField(path);
    const type = query.getType(field);
    return (
      <tr>
        <td>
          <SLink onClick={() => query.removeFilter(index)}>close</SLink>{" "}
          <TLink
            onClick={() => query.addField(path, prettyPath, type.defaultSort)}
          >
            {prettyPath.join(" ")}
          </TLink>{" "}
        </td>
        <td>
          <select
            className="Lookup"
            value={lookup}
            onChange={(e) => query.setFilterLookup(index, e.target.value)}
          >
            {type.sortedLookups.map((lookupName) => (
              <option key={lookupName} value={lookupName}>
                {lookupName.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </td>
        <td>=</td>
        <td>
          <FilterValue
            {...{ value, field }}
            onChange={(val) => query.setFilterValue(index, val)}
            lookup={type.lookups[lookup]}
          />
          {errorMessage && <p className="Error">{errorMessage}</p>}
        </td>
      </tr>
    );
  }
}

function Filters(props) {
  const { query, filterErrors } = props;
  return (
    <form className="Filters">
      <table className="Flat">
        <tbody>
          {props.filters.map((filter, index) => (
            <Filter
              {...{ query, index }}
              {...filter}
              key={index}
              errorMessage={filterErrors[index]}
            />
          ))}
        </tbody>
      </table>
    </form>
  );
}

class Field extends React.Component {
  constructor(props) {
    super(props);
    this.state = { toggled: false };
  }

  toggle() {
    this.setState((state) => ({
      toggled: !state.toggled,
    }));
  }

  render() {
    const { query, path, prettyPath, modelField } = this.props;
    const type = query.getType(modelField);
    return (
      <>
        <tr>
          <td>
            {modelField.concrete && type.defaultLookup && (
              <SLink onClick={() => query.addFilter(path, prettyPath)}>
                filter_alt
              </SLink>
            )}
          </td>
          <td>
            {modelField.model && (
              <SLink className="ToggleLink" onClick={this.toggle.bind(this)}>
                {this.state.toggled ? "remove" : "add"}
              </SLink>
            )}
          </td>
          <td>
            {modelField.type ? (
              <TLink
                onClick={() =>
                  query.addField(path, prettyPath, type.defaultSort)
                }
              >
                {modelField.prettyName}
              </TLink>
            ) : (
              modelField.prettyName
            )}
          </td>
        </tr>
        {this.state.toggled && (
          <tr>
            <td></td>
            <td colSpan="2">
              <AllFields
                {...{ query, path, prettyPath }}
                model={modelField.model}
              />
            </td>
          </tr>
        )}
      </>
    );
  }
}

function AllFields(props) {
  const { query, model, path, prettyPath } = props;
  const modelFields = query.getModelFields(model);
  return (
    <table>
      <tbody>
        {modelFields.sortedFields.map((fieldName) => {
          const modelField = modelFields.fields[fieldName];
          return (
            <Field
              key={fieldName}
              {...{ query, modelField }}
              path={path.concat([fieldName])}
              prettyPath={prettyPath.concat([modelField.prettyName])}
            />
          );
        })}
      </tbody>
    </table>
  );
}

function ModelSelector(props) {
  const { sortedModels, allModelFields, model } = props;
  const history = useHistory();
  return (
    <select
      className="ModelSelector"
      onChange={(e) => {
        history.push(
          `/query/${e.target.value}/.html?${
            allModelFields[e.target.value].defaultFilters
          }`
        );
        window.location.reload(true);
      }}
      value={model}
    >
      {sortedModels.map((model) => (
        <option key={model}>{model}</option>
      ))}
    </select>
  );
}

function Logo(props) {
  return (
    <Link to="/" className="Logo">
      <span>Конструктор запросов</span>
      <span className="Version">v{version}</span>
    </Link>
  );
}

function LogoKS() {
  return (
    <div className="row">
      <div className="row">
        <div>
          <a href="/">
            <img src={logo} alt="" />
          </a>
        </div>
        <div>
            <div>
                <span>Автоматизированная информационная система</span>
            </div>
            <div>
                <span>Комитета по строительству</span>
            </div>
        </div>
      </div>
    </div>

  );
}

function QueryPage(props) {
  const {
    query,
    rows,
    cols,
    body,
    length,
    sortedModels,
    allModelFields,
    model,
    filters,
    filterErrors,
    baseUrl,
    loading,
    error,
    formatHints,
  } = props;

  let overlay;
  if (loading) overlay = "Loading...";
  else if (error) overlay = "Error";

  let results;
  if (query.rowFields().length || query.colFields().length)
    results = (
      <Results {...{ query, rows, cols, body, overlay, formatHints }} />
    );
  else results = <h2>Не выбраны поля</h2>;

  return (
    <>
      <ModelSelector {...{ query, sortedModels, allModelFields, model }} />
      <Filters {...{ query, filters, filterErrors }} />
      <p>
        <span className={length >= query.query.limit ? "Error" : ""}>
          Ограничение:{" "}
          <input
            className="RowLimit"
            type="number"
            value={query.query.limit}
            onChange={(event) => {
              query.setLimit(event.target.value);
            }}
            min="1"
          />{" "}
          - Показано {length} строк -{" "}
        </span>
        <a href={query.getUrlForMedia("csv")}>Скачать CSV</a> -{" "}
        <a href={query.getUrlForMedia("json")}>Просмотр JSON</a> -{" "}
        <Save
          name="View"
          apiUrl={`${baseUrl}api/views/`}
          data={getPartsForQuery(query.query)}
          redirectUrl={(view) => `/views/${view.pk}.html`}
        />
      </p>
      <div className="MainSpace">
        <div className="FieldsList">
          <AllFields {...{ query, model }} path={[]} prettyPath={[]} />
        </div>
        {results}
        <div />
      </div>
    </>
  );
}

function EditSavedView(props) {
  const { canMakePublic, baseUrl } = props;
  const { pk } = useParams();
  const url = `${baseUrl}api/views/${pk}/`;
  const [view, setView] = useData(url);
  if (!view) return "";
  return (
    <div className="EditSavedView">
      <div className="SavedViewActions">
        <span className="SavedViewTitle">Сохранённые представления</span>
        <Link to={view.link}>Открыть</Link>
      </div>
      <form>
        <input
          type="text"
          value={view.name}
          onChange={(event) => {
            setView({ name: event.target.value });
          }}
          className="SavedViewName"
          placeholder="Введите имя"
        />
        <table>
          <tbody>
            <tr>
              <th>Модель:</th>
              <td>{view.model}</td>
            </tr>
            <tr>
              <th>Поля:</th>
              <td>{view.fields.replace(/,/g, "\u200b,")}</td>
            </tr>
            <tr>
              <th>Фильтры:</th>
              <td>{view.query.replace(/&/g, "\u200b&")}</td>
            </tr>
            <tr>
              <th>Предел:</th>
              <td className="SavedViewLimit">
                <input
                  className="RowLimit"
                  type="number"
                  value={view.limit}
                  onChange={(event) => {
                    setView({ limit: event.target.value });
                  }}
                />
              </td>
            </tr>
            <tr>
              <th>Время создания:</th>
              <td>{view.createdTime}</td>
            </tr>
          </tbody>
        </table>
        <textarea
          value={view.description}
          onChange={(event) => {
            setView({ description: event.target.value });
          }}
          placeholder="Введите описание"
        />
        {canMakePublic && (
          <table>
            <tbody>
              <tr>
                <th>Открыть доступ:</th>
                <td>
                  <input
                    type="checkbox"
                    checked={view.public}
                    onChange={(event) => {
                      setView({ public: event.target.checked });
                    }}
                  />
                </td>
              </tr>
              <tr>
                <th>Ссылка:</th>
                <td>{view.public && <CopyText text={view.publicLink} />}</td>
              </tr>
              <tr>
                <th>Google Sheets:</th>
                <td>
                  {view.public && <CopyText text={view.googleSheetsFormula} />}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </form>
      <div className="SavedViewActions">
        <Delete apiUrl={url} redirectUrl="/" />
        <Link to="/">Готово</Link>
      </div>
    </div>
  );
}

function SavedViewList(props) {
  const { baseUrl } = props;
  const [savedViews] = useData(`${baseUrl}api/views/`);
  if (!savedViews) return "";
  return (
    <div>
      <h1>Сохранённые представления</h1>
      <div>
        {savedViews.map((view, index) => (
          <div key={index}>
            <p>
              <Link className="Link" to={view.link}>
                {view.name} - {view.model}
              </Link>{" "}
              (<Link to={`/views/${view.pk}.html`}>редактировать</Link>)
            </p>
            <p>{view.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomePage(props) {
  const { sortedModels, allModelFields, baseUrl } = props;
  return (
    <div className="Index">
      <div>
        <h1>Модели</h1>
        <div>
          {sortedModels.map((model) => (
            <div key={model}>
              <Link
                to={`/query/${model}/.html?${allModelFields[model].defaultFilters}`}
                className="Link"
              >
                {model}
              </Link>
            </div>
          ))}
        </div>
      </div>
      <SavedViewList {...{ baseUrl }} />
    </div>
  );
}

export { HomePage, QueryPage, Logo, LogoKS, EditSavedView };
