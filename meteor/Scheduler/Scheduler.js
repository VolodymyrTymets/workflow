import { _ } from 'lodash';
import { SyncedCron } from 'meteor/percolate:synced-cron';

/**
 * Run scheduler job in app
 *
 * just register your job in ../tasks file
 *
 */
class Scheduler {
  /**
   * Register job for SyncedCron
   *
   * @param {String}
   * @param {string} || {function}
   * @param {function}
   */
  static registerJob(name, schedule, job) {
    SyncedCron.add({
      job,
      name,
      schedule: _.isFunction(schedule) ? schedule : parser => parser.text(schedule),
    });
  }
  /**
   * Start SyncedCron
   */
  static start() {
    SyncedCron.start();
  }
}

export default Scheduler;