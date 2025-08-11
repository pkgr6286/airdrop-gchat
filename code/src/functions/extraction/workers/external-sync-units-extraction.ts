import { ExternalSyncUnit, ExtractorEventType, processTask } from '@devrev/ts-adaas';

import { normalizeSpace } from '../../external-system/data-normalization';
import { HttpClient } from '../../external-system/http-client';

processTask({
  task: async ({ adapter }) => {
    const httpClient = new HttpClient(adapter.event);

    const spaces = await httpClient.listSpaces();
    const externalSyncUnits: ExternalSyncUnit[] = spaces.map((space) => normalizeSpace(space));

    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsDone, {
      external_sync_units: externalSyncUnits,
    });
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionExternalSyncUnitsError, {
      error: {
        message: 'Failed to extract Google Chat spaces. Lambda timeout.',
      },
    });
  },
});