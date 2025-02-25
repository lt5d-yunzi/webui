export class StatsUtils {
  stats;
  constructor() {
  }

  updateStats(obj) {
    this.stats = obj;
    /* if(){
    } else if(){
    } */
    const keys = Object.keys(obj);
    // console.log(keys)
    keys.forEach((item, index) => {
      console.log(item);
    });
  }

  cpuLoad() {
    if (!this.stats || !this.stats.vmstat_summary.cpu) { return null; }

    const sum = this.stats.vmstat_summary.cpu.reduce((accumulator, currentValue) => {
    });

    return {
      coreCount: this.stats.vmstat_summary.cpu.length,
      cores: this.stats.vmstat_summary.cpu,
      sum,
      average: sum / this.stats.vmstat_summary.cpu.length,
    };
  }

  jailLoad() {
    if (!this.stats || !this.stats.process_stats) { return null; }
    // total cpu load as percentage
    const host = { total: 0 };
    const jails = {};
    this.stats.process_stats['process-information'].process.forEach((process, index) => {
      // Avoid duplicates...
      if (process['jail-name'] !== '-' && !jails[process['jail-name']]) {
        jails[process['jail-name']] = { total: 0 };
      }

      const target = process['jail-name'] == '-' ? host : jails[process['jail-name']];
      target.total += parseInt(process['percent-cpu']);
    });

    const result = {
      host,
      jails,
    };

    return result;
  }
}
