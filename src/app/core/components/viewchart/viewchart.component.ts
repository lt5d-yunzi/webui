import {
  Component, AfterViewInit, OnInit, OnChanges, Input, HostListener, SimpleChanges,
} from '@angular/core';
import { LayoutChild } from 'app/core/classes/layouts';
import { ViewComponent } from 'app/core/components/view/view.component';
import { UUID } from 'angular2-uuid';
import { LegendOptions, TooltipOptions } from './viewchart.component.types';

export interface ChartData {
  legend: string;
  data: any[];
}

export interface Legend {
  swatch?: string;
  name: string;
  value?: number | string;
  x?: number | string;
  visible: boolean;
}

export const ViewChartMetadata = {
  template: `
    <div class="viewchart-wrapper {{chartClass}}-wrapper">
      <div *ngIf="chartLoaded" class="legend-wrapper">
        <div class="legend-x legend-item" *ngIf="chartConfig.data.x">Time: <span *ngIf="showLegendValues" class="legend-item-time">{{legend[0].x}}</span></div>
        <div class="legend-html" fxLayout="row wrap" fxLayoutAlign="space-between" fxLayoutGap="16px" >
          <ng-container *ngFor="let item of legend; let i=index ">
            <div fxFlex.xs="calc(33% - 16px)" class="legend-item" *ngIf="chartType != 'gauge'" (click)="focus(legend[i])" [ngClass]="{'legend-item-disabled':!legend[i].visible}">
              <div>
                <span class="legend-swatch" [style.background-color]="legend[i].swatch"></span>
                <span class="legend-name">{{legend[i].name}}: </span>
              </div>
              <div class="legend-value" [style.color]="legend[i].swatch"><span *ngIf="showLegendValues">{{legend[i].value | number : '1.2-2'}}{{units}}</span></div>
            </div>
          </ng-container>
        </div>
      </div>
      <div id="{{chartId}}" [ngClass]="chartClass">
      </div>
    </div>
  `,
};

@Component({
  selector: 'viewchart',
  template: ViewChartMetadata.template,
  styleUrls: ['./viewchart.component.css'],
})
export class ViewChartComponent extends ViewComponent implements AfterViewInit {
  chartColors: string[];
  maxLabels: number;
  units: string;
  max: number;
  @Input() width: number;
  @Input() height: number;

  chart: any;
  chartLoaded = false;
  protected _chartType: string;
  protected _data: any[] = ['No Data', 1];
  protected _chartId: string;
  protected colors: string[];
  legend: Legend[] = [];
  showLegendValues = false;
  protected legendOptions: LegendOptions = {
    show: false,
  };
  protected tooltipOptions: TooltipOptions = {
    contents: (raw, defaultTitleFormat, defaultValueFormat, color) => {
      if (!this.showLegendValues) {
        this.showLegendValues = true;
      }
      const time = raw[0].x;
      for (let index = 0; index < this.legend.length; index++) {
        for (let i = 0; i < raw.length; i++) {
          if (this.legend[index].name == raw[i].name) {
            this.legend[index].value = raw[i].value;
          }
        }
        this.legend[index].x = time;
      }
      return '<div style="display:none">' + time + '</div>';
    },
  };

  protected chartConfig: any;// ChartConfiguration;

  constructor() {
    super();
    this.chartId = 'chart-' + UUID.UUID();
    this.chartType = 'pie';
    this.units = '';
  }

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.data) { // This only works with @Input() properties
      console.log(changes.data);
      if (this.chartConfig) {
        this.chart.load({
          columns: [changes.data],
        });
      }
    }
  }

  get data() {
    return this._data;
  }

  set data(d: ChartData[]) {
    if (!d) {
      this._data = [];
    } else {
      const result: any[] = [];

      for (let i = 0; i < d.length; i++) {
        // setup data
        const item = d[i];
        const legend = [item.legend];
        const dataObj = legend.concat(item.data);
        result.push(dataObj);

        const legendHtmlItem: Legend = {
          swatch: '', name: item.legend, value: 'empty', x: 'empty', visible: true,
        };
        if (this.chartType == 'donut' || this.chartType == 'pie') {
          legendHtmlItem.value = d[i].data[0];
          this.showLegendValues = true;
        }

        // Don't duplicate legend items when new data comes in
        const legendIndex = this.findLegendItem(legendHtmlItem);
        if (legendIndex == -1) {
          this.legend.push(legendHtmlItem);
        } else {
          const dupe = this.legend[legendIndex];
          dupe.value = legendHtmlItem.value;
        }
      }
      this._data = result;

      this.render();
    }
  }

  get chartId(): string {
    return this._chartId;
  }

  set chartId(sel: string) {
    this._chartId = sel;
  }

  get chartClass(): string {
    return this._chartType;
  }

  get chartType(): string {
    return this._chartType;
  }

  set chartType(str: string) {
    this._chartType = str;
  }

  findLegendItem(item: Legend): number {
    for (let i = 0; i < this.legend.length; i++) {
      const legendItem = this.legend[i];
      if (legendItem.name == item.name) {
        return i;
      }
    }
    return -1;
  }

  makeConfig() {
    this.chartConfig = {
      bindto: '#' + this.chartId,
      data: {
        columns: this._data,
        type: this.chartType,
      },
      size: {
        width: this.width,
        height: this.height,
      },
      tooltip: {
        show: false,
        format: {
          value: (value: any) => {
            if (this.units) {
              return value + this.units;
            }
            return value;
          },
        },
      },
    };
    return this.chartConfig;
  }

  focus(item: any): void {
    if (item.visible) {
      this.chart.hide(item.name);
    } else {
      this.chart.show(item.name);
    }
    item.visible = !item.visible;
  }

  refresh(): void {
    // Reset legend to avoid concatenation
    this.render();
  }

  render(conf?: any) {
  }
}
