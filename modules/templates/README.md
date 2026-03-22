# Templates Module

Central place for therapist template reads, filtering and mutations.

## Public API

- `fetchTherapistTemplates(therapistId, options)`
- `fetchTemplateById(templateId)`
- `assignTemplateToClient(template, clientId)`
- `archiveTemplateForTherapist(templateId, therapistId)`
- `updateTemplateThemeColorForTherapist(templateId, therapistId, color)`
- `saveTemplateEditorDraft(input)`
- `filterTemplatesByQuery(templates, query)`
- `isRemoteAsset(uri)`

## Notes

- Therapist template lists use a short-lived cache for snappier overview screens.
- Screen hooks should use this module instead of calling the repository directly.
