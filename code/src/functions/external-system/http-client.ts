import { AirdropEvent } from '@devrev/ts-adaas';
import axios from 'axios';

export class HttpClient {
  private apiEndpoint: string = 'https://chat.googleapis.com/v1';
  private apiToken: string;

  constructor(event: AirdropEvent) {
    this.apiToken = event.payload.connection_data.key;
  }

  private getAuthHeaders() {
    return {
      Authorization: `Bearer ${this.apiToken}`,
      'Content-Type': 'application/json',
    };
  }

  // Fetches all spaces the user is a member of.
  async listSpaces(): Promise<any[]> {
    const response = await axios.get(`${this.apiEndpoint}/spaces`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.spaces || [];
  }

  // Fetches all messages from a given space, handling pagination.
  async listMessages(spaceName: string): Promise<any[]> {
    let allMessages: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const url: string = `${this.apiEndpoint}/${spaceName}/messages?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const response = await axios.get(url, { headers: this.getAuthHeaders() });

      if (response.data.messages) {
        allMessages = allMessages.concat(response.data.messages);
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return allMessages;
  }
}
