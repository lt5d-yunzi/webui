/// <reference lib="webworker" />

// Write a bunch of pure functions above
// and add it to our commands below

const tableUtils = {
  debug: true,
  maxDecimals: (input: any, max?: number) => {
    if (!max) {
      max = 2;
    }
    const str = input.toString().split('.');
    if (!str[1]) {
      // Not a float
      return input;
    }
    const decimals = str[1].length;
    const output = decimals > max ? input.toFixed(max) : input;
    return parseFloat(output);
  },
  arrayAvg: (input: any[]) => {
    const sum = input.reduce((acc, cv) => acc + cv);
    const avg = sum / input.length;
    return maxDecimals(avg);
  },
  avgFromReportData: (input: any[]) => {
    const output: any[] = [];
    input.forEach((item, index) => {
      const avg = arrayAvg(item);
      output.push([avg]);
    });
    return output;
  },
  inferUnits: (label: string) => {
    // Figures out from the label what the unit is
    let units = label;
    if (label.includes('%')) {
      units = '%';
    } else if (label.includes('°')) {
      units = '°';
    } else if (label.toLowerCase().includes('bytes')) {
      units = 'bytes';
    } else if (label.toLowerCase().includes('bits')) {
      units = 'bits';
    }

    if (typeof units == 'undefined') {
      console.warn('Could not infer units from ' + label);
    }

    return units;
  },
  convertKMGT: (input: number, units: string, fixed?: number) => {
    const kilo = 1024;
    const mega = kilo * 1024;
    const giga = mega * 1024;
    const tera = giga * 1024;

    let prefix = '';
    let shortName = '';
    let output: number = input;

    if (input > tera) {
      prefix = 'Tera';
      shortName = ' TiB';
      output = input / tera;
    } else if (input < tera && input > giga) {
      prefix = 'Giga';
      shortName = ' GiB';
      output = input / giga;
    } else if (input < giga && input > mega) {
      prefix = 'Mega';
      shortName = ' MiB';
      output = input / mega;
    } else if (input < mega && input > kilo) {
      prefix = 'Kilo';
      shortName = ' KiB';
      output = input / kilo;
    }

    if (units == 'bits') {
      shortName = shortName.replace(/i/, '');
      shortName = shortName.toLowerCase();
    }

    return { value: output, prefix, shortName };
  },
  convertByKilo: (input: number) => {
    if (typeof input !== 'number') { return input; }
    let output = input;
    const prefix = '';
    let suffix = '';

    if (input >= 1000000) {
      output = input / 1000000;
      suffix = 'm';
    } else if (input < 1000000 && input >= 1000) {
      output = input / 1000;
      suffix = 'k';
    }

    return { value: output, suffix, shortName: '' };
  },
  formatValue: (value: number, units: string, fixed?: number) => {
    let output: any = value;
    if (!fixed) { fixed = -1; }
    if (typeof value !== 'number') { return value; }

    let converted;
    switch (units.toLowerCase()) {
      case 'bits':
        converted = convertKMGT(value, units, fixed);
        output = maxDecimals(converted.value).toString() + converted.shortName;
        break;
      case 'bytes':
        converted = convertKMGT(value, units, fixed);
        output = maxDecimals(converted.value).toString() + converted.shortName;
        break;
      case '%':
      case '°':
      default:
        converted = convertByKilo(output);
        return typeof output == 'number' ? maxDecimals(converted.value).toString() + converted.suffix : value;// [this.limitDecimals(value), ''];
        // break;
    }

    return output; // ? output : value;
  },
  convertAggregations: (input: any, labelY?: string) => {
    const output = { ...input };
    const units = inferUnits(labelY);
    const keys = Object.keys(output.aggregations);

    keys.forEach((key) => {
      // output.aggregations[key].map((v) => formatValue(v , units) )
      output.aggregations[key].forEach((v: any, index: number) => {
        output.aggregations[key][index] = formatValue(v, units);
      });
    });
    return output;
  },
};

function processTableCommands(list: any[]) {
  let output: any;
  list.forEach((item, index) => {
    const input = item.input == '--pipe' || item.input == '|' ? output : item.input;
    output = item.options ? (tableUtils as any)[item.command](input, item.options) : (tableUtils as any)[item.command](input);
  });

  return output;
}

function tableUtilsEmit(evt: any) {
  postMessage(evt);
}

addEventListener('message', ({ data }) => {
  const evt = data;
  let output;
  if (tableUtils.debug) {
    // console.warn("RCVD");
    // console.warn(evt);
  }

  switch (evt.name) {
    case 'SayHello':
      const response = evt.data + ' World!';
      tableUtilsEmit({ name: 'Response', data: response });
      break;
    case 'ProcessCommands':
      output = processTableCommands(evt.data);
      tableUtilsEmit({ name: 'Response', data: output, sender: evt.sender });
      break;
  }
});
