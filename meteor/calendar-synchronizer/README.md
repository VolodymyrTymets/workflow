# Calendar Synchronizer

### Export unExport event into services

In google, microsoft, azure, can:

- export event;
- unExport event;
- update even (if change in service calendar)

###Example of usage

```
 const service = ['google', 'microsoft', 'azureAd']
 new CalendarExporter(service, user).exportOne(ObjectToExport);
 new CalendarExporter(service, user).update(event, oldEvent);
 new CalendarExporter(service, user).unExportOne(event, oldEvent);

 new CalendarExporter(service, this.userId).exportAll();

```

### Addition Information

New to be changed for specific usage
