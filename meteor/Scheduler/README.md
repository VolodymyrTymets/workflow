# Sheduler

```
import Scheduler from'./Scheduler';
import { task } from '../task';

Scheduler.registerJob('Scheduled school summary email', 'at 6:00 pm', task)


Scheduler.start()
```