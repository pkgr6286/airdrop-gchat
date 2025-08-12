import {
  ExternalSystemItem,
  ExternalSystemItemLoadingParams,
  ExternalSystemItemLoadingResponse,
  LoaderEventType,
  processTask,
} from '@devrev/ts-adaas';

import { denormalizeTodo } from '../../external-system/data-denormalization';
import { HttpClient } from '../../external-system/http-client';
import { LoaderState } from '../index';

// TODO: Replace with your create function that will be used to make API calls
// to the external system to create a new item. Function must return object with
// id, error or delay depending on the response from the external system.
async function createMessage({
  item,
  mappers,
  event,
}: ExternalSystemItemLoadingParams<ExternalSystemItem>): Promise<ExternalSystemItemLoadingResponse> {
  // TODO: Replace with your HTTP client that will be used to make API calls
  // to the external system.
  const httpClient = new HttpClient(event);
  const todo = denormalizeTodo(item);

  const messages = await httpClient.listMessages(todo.name);
  console.log(messages);
  return {
    id: todo.id,
    error: undefined,
    delay: undefined,
  };
}

// TODO: Replace with your update function that will be used to make API calls
// to the external system to update an existing item. Function must return
// object with id, error or delay depending on the response from the external
// system.
async function updateMessage({
  item,
  mappers,
  event,
}: ExternalSystemItemLoadingParams<ExternalSystemItem>): Promise<ExternalSystemItemLoadingResponse> {
  // TODO: Replace with your HTTP client that will be used to make API calls
  // to the external system.
  const httpClient = new HttpClient(event);

  // TODO: In case you need to get the external id of the item, you can use
  // the mappers.getByTargetId function to get the sync mapper record
  // for the item. The sync mapper record will contain the external id of
  // the item in the external system.
  // const syncMapperRecordResponse = await mappers.getByTargetId({
  //   sync_unit: event.payload.event_context.sync_unit,
  //   target: item.id.devrev,
  // });
  // const todoExternalId = syncMapperRecordResponse.data.sync_mapper_record.external_ids[0];

  const todo = denormalizeTodo(item);

  const messages = await httpClient.listMessages(todo.name);
  console.log(messages);
  return {
    id: todo.id,
    error: undefined,
    delay: undefined,
  };
}

processTask<LoaderState>({
  task: async ({ adapter }) => {
    const { reports, processed_files } = await adapter.loadItemTypes({
      itemTypesToLoad: [
        {
          itemType: 'gchat_message',
          create: createMessage,
          update: updateMessage,
        },
      ],
    });

    await adapter.emit(LoaderEventType.DataLoadingDone, {
      reports,
      processed_files,
    });
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(LoaderEventType.DataLoadingProgress, {
      reports: adapter.reports,
      processed_files: adapter.processedFiles,
    });
  },
});
