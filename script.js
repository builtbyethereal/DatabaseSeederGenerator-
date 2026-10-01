(function () {
  'use strict';

  const TABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const FIELD_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
  const COPY_DELAY = 1500;
  const MAX_UNIQUE_ATTEMPTS = 80;

  const firstNames = ['Emma','Olivia','Sophia','Amelia','Ava','Mia','Charlotte','Isabella','Harper','Ella','Grace','Chloe','Lily','Zoe','Nora','Maya','Aria','Leah','Hannah','Sara','James','Daniel','Michael','William','Alexander','Ethan','Lucas','Benjamin','Henry','Leo','Noah','Liam','Mason','Logan','Oliver','Jacob','Elijah','David','Samuel','Ryan','Kasun','Nimal','Ayesha','Priya'];
  const lastNames = ['Smith','Johnson','Williams','Brown','Jones','Wilson','Taylor','Anderson','Thomas','Moore','Martin','Jackson','Thompson','White','Lopez','Lee','Walker','Hall','Allen','Young','King','Wright','Scott','Green','Baker','Adams','Nelson','Carter','Mitchell','Perez','Roberts','Turner','Phillips','Campbell','Parker','Evans','Edwards','Collins','Stewart','Morris','Perera','Fernando','Silva','Jayasinghe'];
  const cities = ['London','New York','Colombo','Kandy','Sydney','Melbourne','Toronto','Tokyo','Singapore','Dubai','Berlin','Paris','Amsterdam','Dublin','Madrid','Rome','Lisbon','Oslo','Stockholm','Copenhagen','Bangkok','Seoul','Mumbai','Delhi','Cape Town','Nairobi','Auckland','Vancouver','Chicago','Austin','Doha','Zurich'];
  const countries = ['United States','United Kingdom','Sri Lanka','Canada','Australia','Japan','Singapore','Germany','France','Netherlands','Ireland','Spain','Italy','Portugal','Norway','Sweden','Denmark','Thailand','South Korea','India','South Africa','Kenya','New Zealand','UAE','Qatar','Switzerland','Brazil','Mexico','Malaysia','Indonesia','Philippines','Finland'];
  const jobTitles = ['Software Engineer','Product Manager','Designer','QA Engineer','Data Analyst','Project Manager','Support Engineer','Marketing Manager','Sales Executive','Accountant','DevOps Engineer','Database Administrator','UX Researcher','Business Analyst','HR Manager','Operations Lead'];
  const companyPrefixes = ['Northstar','BluePeak','Nova','Pixel','BrightPath','Vertex','CloudNine','SilverLine','GreenField','Rapid','Lumen','Orbit','Summit','Cobalt','Ethereal'];
  const companySuffixes = ['Labs','Systems','Works','Craft','Technologies','Solutions','Studio','Analytics','Networks','Industries','Digital','Group'];
  const productAdjectives = ['Pro','Ultra','Smart','Compact','Premium','Eco','Rapid','Classic','Bright','Flex','Prime','Modern'];
  const productNouns = ['Wireless Keyboard','Desk Lamp','Travel Bottle','USB Hub','Notebook','Monitor Stand','Phone Dock','Backpack','Mouse Pad','Cable Kit','Planner','Webcam'];
  const words = ['alpha','bravo','pixel','orbit','lumen','river','stone','forest','ember','signal','matrix','nova','vertex','canvas','harbor','meadow'];
  const currencies = ['USD','EUR','GBP','LKR','AUD','CAD','JPY','SGD','AED','INR'];

  const typeGroups = {
    Basic: [['autoId','Auto Increment ID'],['integer','Integer'],['decimal','Decimal'],['boolean','Boolean'],['text','Text'],['fixed','Fixed Value']],
    Person: [['fullName','Full Name'],['firstName','First Name'],['lastName','Last Name'],['username','Username'],['email','Email'],['phone','Phone Number'],['age','Age']],
    Location: [['country','Country'],['city','City'],['address','Street Address'],['postal','Postal Code'],['latitude','Latitude'],['longitude','Longitude']],
    'Internet / Tech': [['url','URL'],['ipv4','IPv4 Address'],['uuid','UUID'],['mac','MAC Address'],['slug','Slug'],['domain','Domain']],
    'Date / Time': [['date','Date'],['datetime','Date & Time'],['timestamp','Timestamp'],['year','Year']],
    Business: [['company','Company Name'],['jobTitle','Job Title'],['product','Product Name'],['price','Price'],['currency','Currency Code']],
    Other: [['word','Random Word'],['sentence','Random Sentence'],['paragraph','Random Paragraph'],['color','Color Hex'],['status','Status'],['customList','Custom List']]
  };

  const templates = {
    users: [['id','autoId'],['name','fullName'],['email','email',true],['phone','phone'],['age','age'],['active','boolean'],['created_at','datetime']],
    products: [['id','autoId'],['name','product'],['slug','slug',true],['price','price'],['stock','integer'],['active','boolean'],['created_at','datetime']],
    orders: [['id','autoId'],['customer_name','fullName'],['email','email'],['amount','price'],['status','status'],['created_at','datetime']],
    employees: [['id','autoId'],['name','fullName'],['email','email',true],['job_title','jobTitle'],['company','company'],['city','city'],['salary','decimal'],['joined_at','date']],
    api: [['uuid','uuid',true],['name','fullName'],['email','email'],['status','status'],['created_at','datetime']]
  };

  const tableNameInput = document.getElementById('tableName');
  const recordCountInput = document.getElementById('recordCount');
  const outputFormatSelect = document.getElementById('outputFormat');
  const sqlDialectSelect = document.getElementById('sqlDialect');
  const dialectField = document.getElementById('dialectField');
  const randomSeedInput = document.getElementById('randomSeed');
  const templateSelect = document.getElementById('templateSelect');
  const loadTemplateButton = document.getElementById('loadTemplateButton');
  const generateButton = document.getElementById('generateButton');
  const resetButton = document.getElementById('resetButton');
  const addFieldButton = document.getElementById('addFieldButton');
  const fieldList = document.getElementById('fieldList');
  const outputText = document.getElementById('outputText');
  const previewWrap = document.getElementById('previewWrap');
  const previewSummary = document.getElementById('previewSummary');
  const messageBox = document.getElementById('messageBox');
  const copyButton = document.getElementById('copyButton');
  const downloadButton = document.getElementById('downloadButton');
  const selectAllButton = document.getElementById('selectAllButton');
  const regenerateButton = document.getElementById('regenerateButton');
  const themeToggle = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  const formatNote = document.getElementById('formatNote');

  const statRecords = document.getElementById('statRecords');
  const statFields = document.getElementById('statFields');
  const statSize = document.getElementById('statSize');
  const statTime = document.getElementById('statTime');

  let fields = [];
  let fieldIdCounter = 1;
  let lastRecords = [];
  let copyTimer;

  function defaultOptions(type) {
    return {
      start: 1,
      min: type === 'age' ? 18 : type === 'price' ? 1 : 1,
      max: type === 'age' ? 80 : type === 'price' ? 1000 : type === 'integer' ? 100 : 1000,
      decimals: type === 'price' ? 2 : 2,
      minLength: 8,
      maxLength: 40,
      fixedValue: 'active',
      list: type === 'customList' ? 'admin\neditor\ncustomer\nmoderator' : 'active, inactive, pending',
      fromDate: '2024-01-01',
      toDate: '2026-12-31',
      nullChance: 10
    };
  }

  function createField(name, type, unique) {
    return {
      id: fieldIdCounter++,
      name: name || '',
      type: type || 'text',
      nullable: false,
      unique: Boolean(unique),
      userTypeChanged: false,
      options: defaultOptions(type || 'text')
    };
  }

  function resetGenerator() {
    tableNameInput.value = 'users';
    recordCountInput.value = '10';
    outputFormatSelect.value = 'sql';
    sqlDialectSelect.value = 'mysql';
    randomSeedInput.value = '';
    loadTemplate('users');
    outputText.value = '';
    lastRecords = [];
    updatePreview([], []);
    updateStats(0, fields.length, '0 B', '0 ms');
    clearMessage();
    updateFormatVisibility();
  }

  function loadTemplate(name) {
    fields = (templates[name] || templates.users).map(function (item) {
      const field = createField(item[0], item[1], item[2]);
      if (field.name === 'stock') {
        field.options.min = 0;
        field.options.max = 100;
      }
      if (field.name === 'salary') {
        field.options.min = 25000;
        field.options.max = 150000;
        field.options.decimals = 2;
      }
      return field;
    });
    renderFields();
  }

  function getSuggestedType(name) {
    const key = name.trim().toLowerCase();
    const map = {
      id: 'autoId',
      name: 'fullName',
      first_name: 'firstName',
      last_name: 'lastName',
      email: 'email',
      phone: 'phone',
      age: 'age',
      company: 'company',
      price: 'price',
      amount: 'price',
      salary: 'decimal',
      status: 'status',
      uuid: 'uuid',
      created_at: 'datetime',
      updated_at: 'datetime',
      joined_at: 'date',
      country: 'country',
      city: 'city',
      url: 'url',
      active: 'boolean',
      slug: 'slug'
    };
    return map[key];
  }

  function typeOptionsHtml(selected) {
    return Object.keys(typeGroups).map(function (group) {
      const options = typeGroups[group].map(function (item) {
        return '<option value="' + item[0] + '"' + (item[0] === selected ? ' selected' : '') + '>' + item[1] + '</option>';
      }).join('');
      return '<optgroup label="' + group + '">' + options + '</optgroup>';
    }).join('');
  }

  function renderOptionControls(field) {
    const o = field.options;
    if (field.type === 'autoId') return numberOption(field.id, 'start', 'Start from', o.start);
    if (field.type === 'integer' || field.type === 'age') return numberOption(field.id, 'min', 'Minimum', o.min) + numberOption(field.id, 'max', 'Maximum', o.max);
    if (field.type === 'decimal' || field.type === 'price') return numberOption(field.id, 'min', 'Minimum', o.min) + numberOption(field.id, 'max', 'Maximum', o.max) + numberOption(field.id, 'decimals', 'Decimal places', o.decimals);
    if (field.type === 'text') return numberOption(field.id, 'minLength', 'Minimum length', o.minLength) + numberOption(field.id, 'maxLength', 'Maximum length', o.maxLength);
    if (field.type === 'fixed') return textOption(field.id, 'fixedValue', 'Value', o.fixedValue);
    if (field.type === 'status' || field.type === 'customList') return textAreaOption(field.id, 'list', field.type === 'status' ? 'Statuses' : 'Items', o.list);
    if (field.type === 'date' || field.type === 'datetime' || field.type === 'timestamp') return dateOption(field.id, 'fromDate', 'From date', o.fromDate) + dateOption(field.id, 'toDate', 'To date', o.toDate);
    return '<div class="option-field full"><label>Options</label><input value="Auto" disabled></div>';
  }

  function numberOption(id, key, label, value) {
    return '<div class="option-field"><label>' + label + '</label><input type="number" data-option="' + key + '" data-field="' + id + '" value="' + value + '"></div>';
  }

  function dateOption(id, key, label, value) {
    return '<div class="option-field"><label>' + label + '</label><input type="date" data-option="' + key + '" data-field="' + id + '" value="' + value + '"></div>';
  }

  function textOption(id, key, label, value) {
    return '<div class="option-field full"><label>' + label + '</label><input type="text" data-option="' + key + '" data-field="' + id + '" value="' + escapeHtml(value) + '"></div>';
  }

  function textAreaOption(id, key, label, value) {
    return '<div class="option-field full"><label>' + label + '</label><textarea rows="2" data-option="' + key + '" data-field="' + id + '">' + escapeHtml(value) + '</textarea></div>';
  }

  function renderFields() {
    fieldList.innerHTML = fields.map(function (field, index) {
      return '<article class="field-row" data-id="' + field.id + '">' +
        '<div class="field"><label>Field name</label><input class="field-name" data-id="' + field.id + '" value="' + escapeHtml(field.name) + '" spellcheck="false"></div>' +
        '<div class="field"><label>Data type</label><select class="field-type" data-id="' + field.id + '">' + typeOptionsHtml(field.type) + '</select></div>' +
        '<div class="field-options">' + renderOptionControls(field) + (field.nullable ? numberOption(field.id, 'nullChance', 'Null chance %', field.options.nullChance) : '') + '</div>' +
        '<div class="toggle-stack">' +
          '<label class="toggle"><input type="checkbox" class="nullable-toggle" data-id="' + field.id + '"' + (field.nullable ? ' checked' : '') + '> Nullable</label>' +
          '<label class="toggle"><input type="checkbox" class="unique-toggle" data-id="' + field.id + '"' + (field.unique ? ' checked' : '') + '> Unique</label>' +
          '<div class="row-buttons">' +
            '<button class="icon-button move-up" type="button" data-id="' + field.id + '" aria-label="Move field up"' + (index === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button class="icon-button move-down" type="button" data-id="' + field.id + '" aria-label="Move field down"' + (index === fields.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button class="icon-button delete" type="button" data-id="' + field.id + '" aria-label="Delete field">×</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    }).join('');
  }

  function findField(id) {
    return fields.find(function (field) { return field.id === Number(id); });
  }

  function addField(name, type) {
    fields.push(createField(name || 'field_' + (fields.length + 1), type || 'text'));
    renderFields();
  }

  function removeField(id) {
    fields = fields.filter(function (field) { return field.id !== Number(id); });
    renderFields();
  }

  function moveField(id, direction) {
    const index = fields.findIndex(function (field) { return field.id === Number(id); });
    const target = index + direction;
    if (index < 0 || target < 0 || target >= fields.length) return;
    const item = fields.splice(index, 1)[0];
    fields.splice(target, 0, item);
    renderFields();
  }

  function getFieldConfig() {
    return fields.map(function (field) {
      return {
        id: field.id,
        name: field.name.trim(),
        type: field.type,
        nullable: field.nullable,
        unique: field.unique,
        options: Object.assign({}, field.options)
      };
    });
  }

  function showMessage(message, type) {
    messageBox.hidden = false;
    messageBox.textContent = message;
    messageBox.dataset.type = type || 'error';
  }

  function clearMessage() {
    messageBox.hidden = true;
    messageBox.textContent = '';
  }

  function validateConfig(config) {
    const errors = [];
    const tableName = tableNameInput.value.trim();
    const count = Number(recordCountInput.value);
    const fieldNames = new Set();

    document.querySelectorAll('.field-row').forEach(function (row) { row.classList.remove('is-invalid'); });

    if (!tableName) errors.push('Table name is required.');
    else if (!TABLE_NAME_PATTERN.test(tableName)) errors.push('Table name can use only letters, numbers, and underscores.');
    if (!Number.isInteger(count) || count < 1 || count > 10000) errors.push('Records must be between 1 and 10,000.');
    if (config.length === 0) errors.push('Add at least one field.');

    config.forEach(function (field) {
      const row = document.querySelector('.field-row[data-id="' + field.id + '"]');
      if (!field.name) {
        errors.push('Each field must have a name.');
        if (row) row.classList.add('is-invalid');
      } else if (!FIELD_NAME_PATTERN.test(field.name)) {
        errors.push('Field names can use only letters, numbers, and underscores.');
        if (row) row.classList.add('is-invalid');
      }
      const lower = field.name.toLowerCase();
      if (fieldNames.has(lower)) {
        errors.push('Field names must be unique.');
        if (row) row.classList.add('is-invalid');
      }
      fieldNames.add(lower);
      if (Number(field.options.min) > Number(field.options.max)) errors.push('Minimum cannot be greater than maximum.');
      if (Number(field.options.minLength) > Number(field.options.maxLength)) errors.push('Minimum length cannot be greater than maximum length.');
    });

    return Array.from(new Set(errors));
  }

  function createRandomSource(seedValue) {
    if (seedValue === '') return Math.random;
    let seed = Number(seedValue) || 1;
    return function () {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  function pick(list, random) {
    return list[Math.floor(random() * list.length)];
  }

  function intBetween(min, max, random) {
    return Math.floor(random() * (max - min + 1)) + min;
  }

  function decimalBetween(min, max, decimals, random) {
    return Number((random() * (max - min) + min).toFixed(decimals));
  }

  function randomDate(from, to, random) {
    const start = new Date(from || '2024-01-01').getTime();
    const end = new Date(to || '2026-12-31').getTime();
    return new Date(Math.min(start, end) + random() * Math.abs(end - start));
  }

  function slugify(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function uuid(random) {
    if (random === Math.random && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.floor(random() * 16);
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function parseList(value) {
    return String(value || '').split(/\n|,/).map(function (item) { return item.trim(); }).filter(Boolean);
  }

  function generateBaseValue(field, rowIndex, random, record) {
    const o = field.options;
    const first = pick(firstNames, random);
    const last = pick(lastNames, random);
    const full = first + ' ' + last;
    switch (field.type) {
      case 'autoId': return Number(o.start || 1) + rowIndex;
      case 'integer': return intBetween(Number(o.min), Number(o.max), random);
      case 'decimal': return decimalBetween(Number(o.min), Number(o.max), Number(o.decimals), random);
      case 'boolean': return random() >= 0.5;
      case 'text': return randomSentence(random, Number(o.minLength), Number(o.maxLength));
      case 'fixed': return o.fixedValue;
      case 'fullName': return full;
      case 'firstName': return first;
      case 'lastName': return last;
      case 'username': return slugify(first + '.' + last + intBetween(10, 999, random));
      case 'email': return slugify(first + '.' + last) + '@example.com';
      case 'phone': return '+1-' + intBetween(200, 999, random) + '-' + intBetween(100, 999, random) + '-' + intBetween(1000, 9999, random);
      case 'age': return intBetween(Number(o.min), Number(o.max), random);
      case 'country': return pick(countries, random);
      case 'city': return pick(cities, random);
      case 'address': return intBetween(10, 999, random) + ' ' + pick(words, random) + ' Street';
      case 'postal': return String(intBetween(10000, 99999, random));
      case 'latitude': return decimalBetween(-90, 90, 6, random);
      case 'longitude': return decimalBetween(-180, 180, 6, random);
      case 'url': return 'https://' + slugify(pick(companyPrefixes, random)) + '.example.com/' + slugify(pick(words, random));
      case 'ipv4': return [1,2,3,4].map(function () { return intBetween(1, 254, random); }).join('.');
      case 'uuid': return uuid(random);
      case 'mac': return Array.from({ length: 6 }, function () { return intBetween(0, 255, random).toString(16).padStart(2, '0'); }).join(':');
      case 'slug': return slugify(record.name || pick(productAdjectives, random) + ' ' + pick(productNouns, random));
      case 'domain': return slugify(pick(companyPrefixes, random)) + '.com';
      case 'date': return randomDate(o.fromDate, o.toDate, random).toISOString().slice(0, 10);
      case 'datetime': return randomDate(o.fromDate, o.toDate, random).toISOString().slice(0, 19).replace('T', ' ');
      case 'timestamp': return Math.floor(randomDate(o.fromDate, o.toDate, random).getTime() / 1000);
      case 'year': return intBetween(2000, 2026, random);
      case 'company': return pick(companyPrefixes, random) + ' ' + pick(companySuffixes, random);
      case 'jobTitle': return pick(jobTitles, random);
      case 'product': return pick(productAdjectives, random) + ' ' + pick(productNouns, random);
      case 'price': return decimalBetween(Number(o.min), Number(o.max), 2, random);
      case 'currency': return pick(currencies, random);
      case 'word': return pick(words, random);
      case 'sentence': return randomSentence(random, 35, 90);
      case 'paragraph': return randomSentence(random, 160, 260);
      case 'color': return '#' + intBetween(0, 0xffffff, random).toString(16).padStart(6, '0');
      case 'status': return pick(parseList(o.list), random) || 'active';
      case 'customList': return pick(parseList(o.list), random) || '';
      default: return randomSentence(random, 8, 24);
    }
  }

  function randomSentence(random, minLength, maxLength) {
    let text = '';
    while (text.length < minLength) text += (text ? ' ' : '') + pick(words, random);
    while (text.length < maxLength && random() > 0.45) text += ' ' + pick(words, random);
    return text.charAt(0).toUpperCase() + text.slice(1) + '.';
  }

  function generateValue(field, rowIndex, random, record, uniqueSets, warnings) {
    if (field.nullable && random() * 100 < Number(field.options.nullChance || 0)) return null;
    if (!field.unique) return generateBaseValue(field, rowIndex, random, record);
    const set = uniqueSets.get(field.name) || new Set();
    uniqueSets.set(field.name, set);
    for (let attempt = 0; attempt < MAX_UNIQUE_ATTEMPTS; attempt += 1) {
      let value = generateBaseValue(field, rowIndex + attempt, random, record);
      if (field.type === 'email' && set.has(value)) {
        const parts = String(value).split('@');
        value = parts[0] + (attempt + 2) + '@' + parts[1];
      }
      const key = String(value);
      if (!set.has(key)) {
        set.add(key);
        return value;
      }
    }
    warnings.push('Unique value limit reached for "' + field.name + '". Some values may repeat.');
    return generateBaseValue(field, rowIndex, random, record);
  }

  function generateRecords(config, count, random, warnings) {
    const uniqueSets = new Map();
    const records = [];
    for (let i = 0; i < count; i += 1) {
      const record = {};
      config.forEach(function (field) {
        record[field.name] = generateValue(field, i, random, record, uniqueSets, warnings);
      });
      records.push(record);
    }
    return records;
  }

  function quoteIdentifier(identifier, dialect) {
    return dialect === 'mysql' ? '`' + identifier.replace(/`/g, '``') + '`' : '"' + identifier.replace(/"/g, '""') + '"';
  }

  function escapeSqlString(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "''").replace(/\r/g, '\\r').replace(/\n/g, '\\n').replace(/\t/g, '\\t');
  }

  function formatNumberForField(value, field) {
    if ((field.type === 'price' || field.type === 'decimal') && value !== null && value !== undefined) {
      return Number(value).toFixed(Number(field.options.decimals || 2));
    }

    return String(value);
  }

  function sqlValue(value, dialect, field) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'number') return formatNumberForField(value, field);
    if (typeof value === 'boolean') return dialect === 'mysql' || dialect === 'sqlite' ? (value ? '1' : '0') : (value ? 'TRUE' : 'FALSE');
    return "'" + escapeSqlString(value) + "'";
  }

  function generateSql(records, fields, table, dialect) {
    const cols = fields.map(function (f) { return quoteIdentifier(f.name, dialect); }).join(', ');
    const rows = records.map(function (record) {
      return '(' + fields.map(function (f) { return sqlValue(record[f.name], dialect, f); }).join(', ') + ')';
    });
    return 'INSERT INTO ' + quoteIdentifier(table, dialect) + ' (' + cols + ') VALUES\n' + rows.join(',\n') + ';';
  }

  function escapeCsvValue(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
  }

  function csvOutputValue(value, field) {
    if (typeof value === 'number') return formatNumberForField(value, field);
    return value;
  }

  function generateCsv(records, fields) {
    const header = fields.map(function (f) { return escapeCsvValue(f.name); }).join(',');
    const rows = records.map(function (record) {
      return fields.map(function (f) { return escapeCsvValue(csvOutputValue(record[f.name], f)); }).join(',');
    });
    return [header].concat(rows).join('\n');
  }

  function generateJavaScript(records) {
    return 'const seedData = ' + JSON.stringify(records, null, 2) + ';';
  }

  function escapePhpString(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  function phpValue(value, field) {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'number') return formatNumberForField(value, field);
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    return "'" + escapePhpString(value) + "'";
  }

  function generateLaravelSeeder(records, fields, table) {
    const rows = records.map(function (record) {
      const lines = fields.map(function (field) {
        return "        '" + field.name + "' => " + phpValue(record[field.name], field) + ',';
      }).join('\n');
      return '    [\n' + lines + '\n    ]';
    }).join(',\n');
    return "DB::table('" + escapePhpString(table) + "')->insert([\n" + rows + '\n]);';
  }

  function generateOutput(records, fields, format, table, dialect) {
    if (format === 'json') return JSON.stringify(records, null, 2);
    if (format === 'csv') return generateCsv(records, fields);
    if (format === 'javascript') return generateJavaScript(records);
    if (format === 'laravel') return generateLaravelSeeder(records, fields, table);
    return generateSql(records, fields, table, dialect);
  }

  function updatePreview(records, fields) {
    if (!records.length || !fields.length) {
      previewWrap.innerHTML = '';
      previewSummary.textContent = 'Generate data to see a preview.';
      return;
    }
    const shown = records.slice(0, 10);
    previewSummary.textContent = records.length > 10 ? 'Showing first 10 of ' + records.length.toLocaleString() + ' records' : 'Showing ' + records.length + ' generated records';
    const head = '<thead><tr>' + fields.map(function (f) { return '<th>' + escapeHtml(f.name) + '</th>'; }).join('') + '</tr></thead>';
    const body = '<tbody>' + shown.map(function (record) {
      return '<tr>' + fields.map(function (f) { return '<td>' + escapeHtml(formatPreview(record[f.name])) + '</td>'; }).join('') + '</tr>';
    }).join('') + '</tbody>';
    previewWrap.innerHTML = '<table>' + head + body + '</table>';
  }

  function formatPreview(value) {
    if (value === null || value === undefined) return 'null';
    return String(value);
  }

  function updateStats(records, fieldCount, size, time) {
    statRecords.textContent = Number(records).toLocaleString();
    statFields.textContent = Number(fieldCount).toLocaleString();
    statSize.textContent = size;
    statTime.textContent = time;
  }

  function formatBytes(text) {
    const bytes = new Blob([text]).size;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1).replace(/\.0$/, '') + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB';
  }

  function generate() {
    clearMessage();
    const started = performance.now();
    const config = getFieldConfig();
    const errors = validateConfig(config);
    if (errors.length) {
      showMessage(errors[0], 'error');
      return;
    }
    const count = Number(recordCountInput.value);
    const warnings = [];
    if (count > 5000) warnings.push('Large datasets may take a moment to generate.');
    const random = createRandomSource(randomSeedInput.value.trim());
    const records = generateRecords(config, count, random, warnings);
    const output = generateOutput(records, config, outputFormatSelect.value, tableNameInput.value.trim(), sqlDialectSelect.value);
    const elapsed = Math.max(1, Math.round(performance.now() - started));
    outputText.value = output;
    lastRecords = records;
    updatePreview(records, config);
    updateStats(records.length, config.length, formatBytes(output), elapsed + ' ms');
    formatNote.textContent = outputFormatSelect.value === 'laravel'
      ? 'Laravel output is intended as starter seeder code and should be reviewed before use.'
      : 'Generated data is intended for development and testing. Review it before using it in real database environments.';
    if (warnings.length) showMessage(warnings.join(' '), 'warning');
  }

  function copyOutput() {
    outputText.focus();
    outputText.select();
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(outputText.value).catch(function () { document.execCommand('copy'); });
    } else {
      document.execCommand('copy');
    }
    clearTimeout(copyTimer);
    copyButton.textContent = 'Copied!';
    copyTimer = setTimeout(function () { copyButton.textContent = 'Copy'; }, COPY_DELAY);
  }

  function downloadOutput() {
    const table = tableNameInput.value.trim() || 'seed';
    const format = outputFormatSelect.value;
    const extensions = { sql: 'sql', json: 'json', csv: 'csv', javascript: 'js', laravel: 'php' };
    const names = { laravel: table + '-seeder.php' };
    const filename = names[format] || table + '-seed.' + extensions[format];
    const blob = new Blob([outputText.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function selectAllOutput() {
    outputText.focus();
    outputText.select();
  }

  function updateFormatVisibility() {
    dialectField.style.display = outputFormatSelect.value === 'sql' ? '' : 'none';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function getTheme() {
    const saved = localStorage.getItem('seederTheme');
    if (saved === 'dark' || saved === 'light') return saved;
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    const dark = theme === 'dark';
    document.body.classList.toggle('theme-dark', dark);
    themeToggle.setAttribute('aria-pressed', String(dark));
    themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    themeLabel.textContent = dark ? 'Dark' : 'Light';
    localStorage.setItem('seederTheme', theme);
  }

  fieldList.addEventListener('input', function (event) {
    const id = event.target.dataset.id || event.target.dataset.field;
    const field = findField(id);
    if (!field) return;
    if (event.target.classList.contains('field-name')) {
      field.name = event.target.value;
      if (!field.userTypeChanged) {
        const suggestion = getSuggestedType(field.name);
        if (suggestion && suggestion !== field.type) {
          field.type = suggestion;
          field.options = Object.assign(field.options, defaultOptions(suggestion));
          renderFields();
        }
      }
    }
    if (event.target.dataset.option) field.options[event.target.dataset.option] = event.target.value;
  });

  fieldList.addEventListener('change', function (event) {
    const field = findField(event.target.dataset.id || event.target.dataset.field);
    if (!field) return;
    if (event.target.classList.contains('field-type')) {
      field.type = event.target.value;
      field.userTypeChanged = true;
      field.options = Object.assign(defaultOptions(field.type), field.options);
      renderFields();
    }
    if (event.target.classList.contains('nullable-toggle')) {
      field.nullable = event.target.checked;
      renderFields();
    }
    if (event.target.classList.contains('unique-toggle')) field.unique = event.target.checked;
  });

  fieldList.addEventListener('click', function (event) {
    const id = event.target.dataset.id;
    if (!id) return;
    if (event.target.classList.contains('delete')) removeField(id);
    if (event.target.classList.contains('move-up')) moveField(id, -1);
    if (event.target.classList.contains('move-down')) moveField(id, 1);
  });

  addFieldButton.addEventListener('click', function () { addField(); });
  loadTemplateButton.addEventListener('click', function () { loadTemplate(templateSelect.value); });
  generateButton.addEventListener('click', generate);
  regenerateButton.addEventListener('click', generate);
  resetButton.addEventListener('click', resetGenerator);
  copyButton.addEventListener('click', copyOutput);
  downloadButton.addEventListener('click', downloadOutput);
  selectAllButton.addEventListener('click', selectAllOutput);
  outputFormatSelect.addEventListener('change', updateFormatVisibility);
  themeToggle.addEventListener('click', function () { applyTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark'); });
  document.addEventListener('keydown', function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      generate();
    }
  });

  applyTheme(getTheme());
  resetGenerator();
})();
