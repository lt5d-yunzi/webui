import {
  Component, Input, AfterViewInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef,
} from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CoreService, CoreEvent } from 'app/core/services/core.service';
import { ThemeUtils } from 'app/core/classes/theme-utils';
import { ViewComponent } from 'app/core/components/view/view.component';
import { Report, ReportData } from '../report/report.component';
import { ThemeService, Theme } from 'app/services/theme/theme.service';

import { UUID } from 'angular2-uuid';
import * as moment from 'moment-timezone';
import Dygraph from 'dygraphs';
import smoothPlotter from 'dygraphs/src/extras/smooth-plotter.js';

interface Conversion {
  value: number;
  prefix?: string;
  suffix?: string;
  shortName?: string;
}

@Component({
  selector: 'linechart',
  templateUrl: './lineChart.component.html',
  styleUrls: ['./lineChart.component.css'],
})
export class LineChartComponent extends ViewComponent implements AfterViewInit, OnDestroy, OnChanges {
  @ViewChild('wrapper', { static: true }) el: ElementRef;
  @Input() chartId: string;
  @Input() chartColors: string[];
  @Input() data: ReportData;
  @Input() report: Report;
  @Input() title: string;
  @Input() timezone: string;
  @Input() stacked = false;

  @Input() legends?: string[];
  @Input() type = 'line';
  @Input() convertToCelsius?: true;
  @Input() dataStructure: 'columns'; // rows vs columns
  @Input() minY?: number = 0;
  @Input() maxY?: number = 100;
  @Input() labelY?: string = 'Label Y';
  @Input() interactive = false;

  library = 'dygraph'; // dygraph or chart.js
  ctx: any; // canvas context for chart.js

  chart: any;
  conf: any;
  columns: any;
  linechartData: any;

  units = '';
  yLabelPrefix: string;
  showLegendValues = false;
  legendEvents: BehaviorSubject<any>;
  legendLabels: BehaviorSubject<any>;
  legendAnalytics: BehaviorSubject<any>;

  _colorPattern: string[] = ['#2196f3', '#009688', '#ffc107', '#9c27b0', '#607d8b', '#00bcd4', '#8bc34a', '#ffeb3b', '#e91e63', '#3f51b5'];
  get colorPattern() {
    return this.chartColors;
  }

  set colorPattern(value) {
    this._colorPattern = value;
  }

  theme: Theme;
  timeFormat = '%H:%M';
  culling = 6;
  controlUid: string;

  private utils: ThemeUtils;

  constructor(private core: CoreService, public themeService: ThemeService) {
    super();
    this.utils = new ThemeUtils();
    this.controlUid = 'chart_' + UUID.UUID();
    this.legendEvents = new BehaviorSubject({ xHTML: '' });
    this.legendLabels = new BehaviorSubject([]);
    this.legendAnalytics = new BehaviorSubject([]);
  }

  applyHandledData(columns: any, linechartData: any, legendLabels: any) {
    this.columns = columns;
    this.linechartData = linechartData;
    this.legendLabels.next(legendLabels);
  }

  render(option?: string) {
    this.renderGraph(option);
  }

  // dygraph renderer
  renderGraph(option: any) {
    if (this.data.name == 'cpu') {
      this.data.legend = this.data.legend.reverse();
      for (let i = 0; i < this.data.data.length; i++) {
        const newRow = [];
        while (this.data.data[i].length) {
          newRow.push(this.data.data[i].pop());
        }
        this.data.data[i] = newRow;
      }
    }

    const data = this.makeTimeAxis(this.data);
    const labels = data.shift();

    const fg2 = this.themeService.currentTheme().fg2;
    const fg2Type = this.utils.getValueType(fg2);
    const fg2RGB = fg2Type == 'hex' ? this.utils.hexToRGB(this.themeService.currentTheme().fg2).rgb : this.utils.rgbToArray(fg2);
    const gridLineColor = 'rgba(' + fg2RGB[0] + ', ' + fg2RGB[1] + ', ' + fg2RGB[2] + ', 0.25)';
    const yLabelSuffix = this.labelY === 'Bits/s' ? this.labelY.toLowerCase() : this.labelY;

    const options = {
      drawPoints: false, // Must be disabled for smoothPlotter
      pointSize: 1,
      includeZero: true,
      highlightCircleSize: 4,
      strokeWidth: 1,
      colors: this.colorPattern,
      labels, // time axis
      ylabel: this.yLabelPrefix + yLabelSuffix,
      gridLineColor,
      showLabelsOnHighlight: false,
      labelsSeparateLines: true,
      axes: {
        y: {
          yRangePad: 24,
          axisLabelFormatter: (numero: any) => {
            const converted = this.formatLabelValue(numero, this.inferUnits(this.labelY), 1, true);
            const suffix = converted.suffix ? converted.suffix : '';
            return this.limitDecimals(converted.value).toString() + suffix;
          },
        },
      },
      legendFormatter: (data: any) => {
        const clone = { ...data };
        clone.series.forEach((item: any, index: number) => {
          if (!item.y) { return; }
          const converted = this.formatLabelValue(item.y, this.inferUnits(this.labelY), 1, true);
          const suffix = converted.shortName !== undefined ? converted.shortName : (converted.suffix !== undefined ? converted.suffix : '');
          clone.series[index].yHTML = this.limitDecimals(converted.value).toString() + suffix;
          if (!clone.stackedTotal) {
            clone.stackedTotal = 0;
          }
          clone.stackedTotal += item.y;
        });
        if (clone.stackedTotal >= 0) {
          const converted = this.formatLabelValue(clone.stackedTotal, this.inferUnits(this.labelY), 1, true);
          const suffix = converted.shortName !== undefined ? converted.shortName : (converted.suffix !== undefined ? converted.suffix : '');
          clone.stackedTotalHTML = this.limitDecimals(converted.value).toString() + suffix;
        }
        this.core.emit({ name: 'LegendEvent-' + this.chartId, data: clone, sender: this });
        return '';
      },
      series: () => {
        const s: any = {};
        this.data.legend.forEach((item, index) => {
          s[item] = { plotter: smoothPlotter };
        });

        return s;
      },
      drawCallback: (dygraph: any) => {
        if (dygraph.axes_) {
          const numero = dygraph.axes_[0].maxyval;
          const converted = this.formatLabelValue(numero, this.inferUnits(this.labelY));
          if (converted.prefix) {
            this.yLabelPrefix = converted.prefix;
          } else {
            this.yLabelPrefix = '';
          }
        } else {
          console.warn('axes not found');
        }
      },
      stackedGraph: this.stacked,
    };

    if (option == 'update') {
      this.chart.updateOptions(options);
    } else {
      this.chart = new Dygraph(this.el.nativeElement, data, options);
    }
  }

  makeColumn(data: ReportData, legendKey: any): number[] {
    const result: any = [];

    for (let i = 0; i < data.data.length; i++) {
      // TODO: Incorrect type
      const value = (data.data[i] as any)[legendKey];
      result.push(value);
    }

    return result;
  }

  protected makeTimeAxis(rd: ReportData): any[] {
    const structure = this.library == 'chart.js' ? 'columns' : 'rows';
    if (structure == 'rows') {
      // Push dates to row based data...
      const rows = [];
      // Add legend with axis to beginning of array
      const legend = Object.assign([], rd.legend);
      legend.unshift('x');
      rows.push(legend);

      for (let i = 0; i < rd.data.length; i++) {
        const item = Object.assign([], rd.data[i]);
        let dateStr = moment.tz(new Date(rd.start * 1000 + i * rd.step * 1000), this.timezone).format();
        // UTC: 2020-12-17T16:33:10Z
        // Los Angeles: 2020-12-17T08:36:30-08:00
        // Change dateStr from '2020-12-17T08:36:30-08:00' to '2020-12-17T08:36'
        const list = dateStr.split(':');
        dateStr = list.join(':');
        const date = new Date(dateStr);

        item.unshift(date);
        rows.push(item);
      }

      return rows;
    } if (structure == 'columns') {
      const columns = [];

      for (let i = 0; i < rd.data.length; i++) {
        const date = new Date(rd.start * 1000 + i * rd.step * 1000);
        columns.push(date);
      }

      return columns;
    }
  }

  private processThemeColors(theme: Theme): string[] {
    this.theme = theme;
    const colors: string[] = [];
    theme.accentColors.map((color) => {
      colors.push((theme as any)[color]);
    });
    return colors;
  }

  private createColorObject() {
    const obj: any = {};
    this.legends.forEach((item, index) => {
      obj[item] = this.colorPattern[index];
    });
    return obj;
  }

  fetchData(rrdOptions: any, timeformat?: string, culling?: number) {
    if (timeformat) {
      this.timeFormat = timeformat;
    }
    if (culling) {
      this.culling = culling;
    }

    // Convert from milliseconds to seconds for epoch time
    rrdOptions.start = Math.floor(rrdOptions.start / 1000);
    if (rrdOptions.end) {
      rrdOptions.end = Math.floor(rrdOptions.end / 1000);
    }
  }

  inferUnits(label: string) {
    // if(this.report.units){ return this.report.units; }
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
      console.warn('Could not infer units from ' + this.labelY);
    }

    return units;
  }

  formatLabelValue(value: number, units: string, fixed?: number, prefixRules?: boolean): Conversion {
    let output: Conversion = { value };
    if (!fixed) { fixed = -1; }
    if (typeof value !== 'number') { return value; }

    switch (units.toLowerCase()) {
      case 'bits':
      case 'bytes':
        output = this.convertKMGT(value, units.toLowerCase(), fixed, prefixRules);
        break;
      case '%':
      case '°':
      default:
        output = this.convertByKilo(value);
    }

    return output;
  }

  convertByKilo(input: number): Conversion {
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

    return { value: output, suffix };
  }

  limitDecimals(numero: number) {
    const subZero = numero.toString().split('.');
    const decimalPlaces = subZero && subZero[1] ? subZero[1].length : 0;
    return decimalPlaces > 2 ? numero.toFixed(2) : numero;
  }

  convertKMGT(value: number, units: string, fixed?: number, prefixRules?: boolean): Conversion {
    const kilo = 1024;
    const mega = kilo * 1024;
    const giga = mega * 1024;
    const tera = giga * 1024;

    let prefix = '';
    let output: number = value;
    let shortName = '';

    if (value > tera || (prefixRules && this.yLabelPrefix == 'Tera')) {
      prefix = 'Tera';
      shortName = 'TiB';
      output = value / tera;
    } else if ((value < tera && value > giga) || (prefixRules && this.yLabelPrefix == 'Giga')) {
      prefix = 'Giga';
      shortName = 'GiB';
      output = value / giga;
    } else if ((value < giga && value > mega) || (prefixRules && this.yLabelPrefix == 'Mega')) {
      prefix = 'Mega';
      shortName = 'MiB';
      output = value / mega;
    } else if ((value < mega && value > kilo || (prefixRules && this.yLabelPrefix == 'Kilo'))) {
      prefix = 'Kilo';
      shortName = 'KB';
      output = value / kilo;
    }

    if (units == 'bits') {
      shortName = shortName.replace(/i/, '').trim();
      shortName = ` ${shortName.charAt(0).toUpperCase()}${shortName.substr(1).toLowerCase()}`; // Kb, Mb, Gb, Tb
    }

    return { value: output, prefix, shortName };
  }

  ngAfterViewInit() {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.data) {
      this.render();
    }

    if (changes.data) {
      if (this.chart) {
        // this.chart.destroy();
        this.render('update');
      } else {
        this.render();// make an update method?
      }
    }
  }

  ngOnDestroy() {
    this.core.unregister({ observerClass: this });

    this.chart.destroy();
  }
}
