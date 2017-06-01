import Scheduler from'./Scheduler';

import { task } from '../task';

/**
 * @file
 * App scheduler jobs
 *
 * Here you can register scheduler jobs, to hold all scheduler in one place
 */

Scheduler.registerJob('Scheduled school summary email', 'at 6:00 pm', task);