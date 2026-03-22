# Resources Module

Central place for therapist resource lists, filtering and mutations.

## Public API

- `fetchTherapistResources(options)`
- `createLinkResource(input)`
- `uploadFileResource(input)`
- `assignResourcesToClients(therapistId, clientIds, resources)`
- `deleteResourceEntry(resource)`
- `togglePinnedResource(resource)`
- `fetchTherapistResourceClients(therapistId)`
- `sortResources(resources)`
- `filterResources(resources, searchQuery, activeFilter)`
- `inferResourceType(mimeType)`

## Notes

- Resource lists use a short-lived cache for faster library opens.
- Therapist screens should prefer this module over direct Firestore calls.
