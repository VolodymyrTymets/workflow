# Permission checker

### Description

Provide permission checker to allow/deny some action on some api.

###Example of usage

```
 import { hasPermissionTo, actions } from '../'
 if (!hasPermissionTo(actions.GET_USER, user,)) {
    throw new MethodNotAllowed();
 }
 ```