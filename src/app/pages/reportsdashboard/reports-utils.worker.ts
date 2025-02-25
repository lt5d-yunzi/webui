/// <reference lib="webworker" />

// Write a bunch of pure functions above
// and add it to our commands below
const debug = true;

const maxDecimals = (input: number, max?: number) => {
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
  return parseFloat(output as any);
};

function arrayAvg(input: number[]) {
  const sum = input.reduce((acc, cv) => acc + cv);
  const avg = sum / input.length;
  return maxDecimals(avg);
}

function avgFromReportData(input: any[]) {
  const output: any[] = [];
  input.forEach((item, index) => {
    const avg = arrayAvg(item);
    output.push([avg]);
  });
  return output;
}

function inferUnits(label: string) {
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
}

function convertKMGT(input: number, units: string, fixed?: number) {
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
    shortName = shortName.replace(/i/, '').trim();
    shortName = ` ${shortName.charAt(0).toUpperCase()}${shortName.substr(1).toLowerCase()}`;
  }

  // if(fixed && fixed !== -1){
  //  return [output.toFixed(fixed), prefix];
  // } else {
  //  return [output.toString(), prefix];
  // }

  return { value: output, prefix, shortName };
}

function convertByKilo(input: number) {
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
}

function formatValue(value: number, units: string, fixed?: number) {
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
}

function convertAggregations(input: any, labelY?: string) {
  const output = { ...input };
  const units = inferUnits(labelY);
  const keys = Object.keys(output.aggregations);

  keys.forEach((key) => {
    // output.aggregations[key].map((v) => formatValue(v , units) )
    (output.aggregations[key] as any[]).forEach((v, index) => {
      output.aggregations[key][index] = formatValue(v, units);
    });
  });
  return output;
}

function optimizeLegend(input: any) {
  const output: { legend: string[] } = input;
  // Do stuff
  switch (input.name) {
    case 'upsbatterycharge':
      output.legend = ['Percent Charge'];
      break;
    case 'upsremainingbattery':
      output.legend = ['Time remaining (Minutes)'];
      break;
    case 'load':
      output.legend = output.legend.map((label) => label.replace(/load_/, ''));
      break;
    case 'disktemp':
      output.legend = ['temperature'];
      break;
    case 'memory':
      output.legend = output.legend.map((label) => label.replace(/memory-/, ''));
      output.legend = output.legend.map((label) => label.replace(/_value/, ''));
      break;
    case 'swap':
      output.legend = output.legend.map((label) => label.replace(/swap-/, ''));
      output.legend = output.legend.map((label) => label.replace(/_value/, ''));
      break;
    case 'interface':
      output.legend = output.legend.map((label) => label.replace(/if_/, ''));
      output.legend = output.legend.map((label) => label.replace(/octets_/, 'octets '));
      break;
    case 'nfsstat':
      output.legend = output.legend.map((label) => label.replace(/nfsstat-/, ''));
      output.legend = output.legend.map((label) => label.replace(/_value/, ''));
      break;
    case 'nfsstatbytes':
      output.legend = output.legend.map((label) => label.replace(/nfsstat-/, ''));
      output.legend = output.legend.map((label) => label.replace(/_bytes_value/, ''));
      break;
    case 'df':
      output.legend = output.legend.map((label) => label.replace(/df_complex-/, ''));
      output.legend = output.legend.map((label) => label.replace(/_value/, ''));
      break;
    case 'processes':
      output.legend = output.legend.map((label) => label.replace(/ps_state-/, ''));
      output.legend = output.legend.map((label) => label.replace(/_value/, ''));
      break;
    case 'uptime':
      output.legend = output.legend.map((label) => label.replace(/_value/, ''));
      break;
    case 'ctl':
    case 'disk':
      output.legend = output.legend.map((label) => label.replace(/disk_octets_/, ''));
      break;
    case 'diskgeombusy':
      output.legend = output.legend.map((label) => 'busy');
      break;
    case 'diskgeomlatency':
      output.legend = output.legend.map((label) => label.replace(/geom_latency-/, ''));
      output.legend = output.legend.map((label) => {
        const spl = label.split('_');
        return spl[1];
      });
      break;
    case 'diskgeomopsrwd':
      output.legend = output.legend.map((label) => label.replace(/geom_ops_rwd-/, ''));
      output.legend = output.legend.map((label) => {
        const spl = label.split('_');
        return spl[1];
      });
      break;
    case 'diskgeomqueue':
      output.legend = output.legend.map((label) => label.replace(/geom_queue-/, ''));
      output.legend = output.legend.map((label) => {
        const spl = label.split('_');
        return spl[1];
      });
      break;
    case 'arcsize':
      output.legend = output.legend.map((label) => label.replace(/cache_size-/, ''));
      output.legend = output.legend.map((label) => label.replace(/_value/, ''));
      break;
    case 'arcratio':
      output.legend = output.legend.map((label) => label.replace(/cache_ratio-/, ''));
      output.legend = output.legend.map((label) => label.replace(/_value/, ''));
      break;
    case 'arcresult':
      output.legend = output.legend.map((label) => {
        const noPrefix = label.replace(/cache_result-/, '');
        const noSuffix = noPrefix.replace(/_value/, '');
        if (noSuffix == 'total') {
          return noSuffix;
        }
        const spl = noSuffix.split('-');
        return spl[1];
      });
      break;
  }
  return output;
}

function avgCpuTempReport(report: any) {
  const output = { ...report };
  // Handle Data
  output.data = avgFromReportData(report.data);

  // Handle Legend
  output.legend = ['Avg Temp'];

  // Handle Aggregations
  const keys = Object.keys(output.aggregations);
  keys.forEach((key, index) => {
    output.aggregations[key] = [arrayAvg(output.aggregations[key])];
  });

  return output;
}

// Pseudo command line interface
// we can call the worker's functions
// using text input. The Unix way ;-)
const commands = {
  // POC commands
  echo: (input: string) => {
    console.log(input);
    return input;
  },
  toLowerCase: (input: string) => {
    const output = input.toLowerCase();
    console.log(output);
    return output;
  },
  length: (input: string) => {
    const output = input.length;
    console.log(output);
    return output;
  },
  avgFromReportData: (input: any) => {
    const output = avgFromReportData(input);
    return output;
  },
  optimizeLegend: (input: any) => {
    const output = optimizeLegend(input);
    return output;
  },
  convertAggregations: (input: any, options?: any) => {
    const output = options ? convertAggregations(input, ...options) : input;
    if (!options) {
      console.warn('You must specify a label to parse. (Usually the Y axis label). Returning input value instead');
    }
    return output;
  },
  avgCpuTempReport: (input: any) => {
    const output = avgCpuTempReport(input);
    return output;
  },
  arrayAvg: (input: any) => {
    const output = arrayAvg(input);
    return output;
  },
  maxDecimals: (input: any, options?: any) => {
    const output = options ? maxDecimals(input, ...options) : maxDecimals(input);
    return output;
  },
};

function processCommands(list: any[]) {
  let output: any;
  list.forEach((item, index) => {
    const input = item.input == '--pipe' || item.input == '|' ? output : item.input;
    output = item.options ? (commands as any)[item.command](input, item.options) : (commands as any)[item.command](input);
  });

  return output;
}

function emit(evt: any) {
  postMessage(evt);
}

addEventListener('message', ({ data }) => {
  const evt = data;
  let output;
  if (debug) {
    // console.warn("RCVD");
    // console.warn(evt);
  }

  switch (evt.name) {
    case 'SayHello':
      const response = evt.data + ' World!';
      emit({ name: 'Response', data: response });
      break;
    case 'ProcessCommands':
      output = processCommands(evt.data);
      emit({ name: 'Response', data: output, sender: evt.sender });
      break;
    case 'ProcessCommandsAsReportData':
      output = processCommands(evt.data);
      emit({ name: 'ReportData', data: output, sender: evt.sender });
      break;
  }
});
