# **Google Chat to DevRev Airdrop Integration**

### **1.0 Introduction to the Google Chat Airdrop Integration**

### **1.1. Overview & Purpose**

This document provides a comprehensive guide to building, deploying, and using a one-way integration that synchronizes conversations from Google Chat into your DevRev organization. The integration is built as a

**DevRev Airdrop Snap-in**, a specialized type of integration designed for data migration and synchronization.

The primary purpose of this solution is to capture unstructured conversations happening in Google Chat and transform them into structured, trackable work items within DevRev. This ensures that important discussions regarding customer issues, bugs, or product feedback are not lost and can be formally managed.

### **1.2. Core Functionality (One-Way Sync)**

This integration provides a one-way synchronization path from Google Chat to DevRev. Its capabilities include:

- 
    
    **One-Time Import**: Perform an initial bulk import of message history from a specified Google Chat Space into DevRev.
    
- 
    
    **Ongoing Synchronization**: Automatically run on a periodic schedule to fetch new messages and threads from the specified Google Chat Space and create corresponding items in DevRev.
    
- **Logical Grouping**: Intelligently groups messages into threads. The first message of a thread is used to create a new DevRev **Ticket**, and all subsequent replies in that same thread are added as **Comments** to that ticket.

### **1.3. Key Concepts**

- 
    
    **DevRev Airdrop**: A DevRev platform feature designed to migrate data from an external system into DevRev or keep the two systems synchronized.
    
- 
    
    **Airdrop Snap-in**: A third-party application developed to connect DevRev’s Airdrop feature to an external system for which a native integration does not exist. This is what we are building.
    
- 
    
    **Sync Unit**: A self-contained unit of data from the external system that can be synced. For this integration, a
    
    **Google Chat Space** is treated as a Sync Unit.
    

### **1.4. Architectural Model**

The integration follows a simple, polling-based architecture:
`Google Chat API -> Airdrop Snap-in -> DevRev Platform`

1. The Airdrop Snap-in, running on a schedule, makes secure API calls to the Google Chat API using OAuth 2.0.
2. It fetches messages from a designated Google Chat Space.
3. The Snap-in normalizes this data and passes it to the DevRev Airdrop Platform.
4. The platform applies mapping rules and creates or updates Tickets and Comments in DevRev.

### **1.5. Scope and Limitations**

This integration is designed specifically for data synchronization. It is important to understand its limitations:

- **No Real-time Interactivity**: It does not support real-time slash commands (e.g., `/devrev create ticket`) in Google Chat.
- **No UI Cards or Buttons**: It cannot post interactive messages with buttons or menus.
- **Polling-Based**: Notifications and updates are not instantaneous; they occur only when the next scheduled sync run is executed.

---

### **2.0 Prerequisites & Environment Setup**

### **2.1. Required Accounts and Tools**

- A DevRev organization with Admin privileges.
- A Google Cloud Platform (GCP) project with billing enabled.
- `Node.js` (version 18.x or higher).
- `Homebrew` (for macOS users).
- The DevRev CLI.

### **2.2. Google Cloud Platform (GCP) Configuration**

### 2.2.1. Creating a New GCP Project

1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/?authuser=1).
2. Create a new project or select an existing one.

### 2.2.2. Enabling the Google Chat API

1. In your GCP project, go to "APIs & Services" -> "Library".
2. Search for "Google Chat API" and click **Enable**.

### 2.2.3. Configuring the OAuth Consent Screen & Scopes

1. Go to "APIs & Services" -> "OAuth consent screen".
2. Choose **External** for the User Type and fill in the required application details.
3. On the "Scopes" page, click "Add or Remove Scopes" and add the following two scopes:
    - `https://www.googleapis.com/auth/chat.messages.readonly`
    - `https://www.googleapis.com/auth/chat.spaces.readonly`
4. Add your email address as a Test User.

### 2.2.4. Creating OAuth 2.0 Credentials (Client ID & Secret)

1. Go to "APIs & Services" -> "Credentials".
2. Click "Create Credentials" -> "OAuth client ID".
3. Select **Web application** as the application type.
4. Under "Authorized redirect URIs", add `https://app.devrev.ai/auth/callback`.
5. Click "Create". Copy the **Client ID** and **Client Secret**. You will need these later.

### **2.3. DevRev CLI Installation**

As discovered during our troubleshooting, the DevRev CLI must be installed using a direct formula download, not via a standard Homebrew tap.

### 2.3.1. Downloading the Official `devrev.rb` Formula

Run the following command in your terminal to download the latest official Homebrew formula from DevRev's GitHub releases.

Bash

`wget https://github.com/devrev/cli/releases/latest/download/devrev.rb`

### 2.3.2. Installing via Homebrew

Install the CLI using the local formula file you just downloaded.

Bash

`brew install ./devrev.rb`

### 2.3.3. Verifying the CLI Version

After installation, verify the version. The latest public version is `v0.4.11`.

Bash

`devrev --version`

> 
> 
> 
> **Note**: The Airdrop documentation's prerequisite of `v4.7` or higher is incorrect. The provided template must be modified to work with the latest public CLI.
> 

### **2.4. Obtaining the Airdrop Snap-in Template**

Clone or download the starter Airdrop snap-in template from the official DevRev repository. This will be the base for our project.

---

### **3.0 Implementation Guide: Building the Snap-in**

This section provides the complete source code to replace the placeholder files in the Airdrop template.

### **3.1. Configuring the Connection (`manifest.yaml`)**

YAML

`name: google-chat-airdrop-connector
description: Google Chat Connector for importing messages and threads into DevRev.
version: '1.0'

functions:
  - name: extraction
    description: Extraction function for the Google Chat snap-in

imports:
  - slug: google-chat-import
    display_name: Google Chat Import
    description: Import threads and messages from Google Chat into DevRev
    extractor_function: extraction
    allowed_connection_types:
      - google-chat-connection

keyring_types:
  - id: google-chat-connection
    name: Google Chat Connection
    description: Connect to Google Chat using OAuth2
    kind: "oauth2"
    is_subdomain: false
    external_system_name: Google Chat
    oauth2_config:
      auth_url: 'https://accounts.google.com/o/oauth2/v2/auth'
      token_url: 'https://oauth2.googleapis.com/token'
      scope: 'https://www.googleapis.com/auth/chat.messages.readonly https://www.googleapis.com/auth/chat.spaces.readonly'
      organization_data:
        type: "config"
        url: 'https://www.googleapis.com/oauth2/v1/userinfo?alt=json'
        method: 'GET'
        response_jq: '{id: .email, name: .name}'`

### **3.2. Defining the External Data Schema (`src/functions/external-system/external_domain_metadata.json`)**

JSON

`{
  "schema_version": "v0.2.0",
  "record_types": {
    "gchat_space": {
      "name": "Google Chat Space"
    },
    "gchat_thread": {
      "name": "Google Chat Thread",
      "fields": {
        "title": { "name": "Title", "is_required": true, "type": "text" },
        "body": { "name": "Body", "is_required": true, "type": "rich_text" },
        "space_id": { "name": "Space ID", "is_required": true, "type": "text" }
      }
    },
    "gchat_message": {
      "name": "Google Chat Message",
      "fields": {
        "text": { "name": "Text", "is_required": true, "type": "rich_text" },
        "creator": { "name": "Creator", "is_required": true, "type": "reference", "reference": { "refers_to": { "#record:gchat_user": {} }}},
        "parent_id": { "name": "Parent Thread", "is_required": true, "type": "reference", "reference": { "refers_to": { "#record:gchat_thread": {} }}}
      }
    },
    "gchat_user": {
      "name": "Google Chat User",
      "fields": {
        "email": { "name": "Email", "is_required": true, "type": "text" },
        "displayName": { "name": "Display Name", "is_required": true, "type": "text" }
      }
    }
  }
}`

### **3.3. Mapping to DevRev Objects (`src/functions/external-system/initial_domain_mapping.json`)**

JSON

`{
  "additional_mappings": {
    "format_version": "v0.2.0",
    "record_type_mappings": {
      "gchat_thread": {
        "default_mapping": { "object_category": "stock", "object_type": "ticket" },
        "possible_record_type_mappings": [{
          "devrev_leaf_type": "ticket", "forward": true, "reverse": false,
          "shard": {
            "devrev_leaf_type": { "object_category": "stock", "object_type": "ticket" }, "mode": "create_shard",
            "stock_field_mappings": {
              "title": { "forward": true, "primary_external_field": "title", "transformation_method_for_set": { "transformation_method": "use_directly" }},
              "body": { "forward": true, "primary_external_field": "body", "transformation_method_for_set": { "transformation_method": "use_directly" }},
              "applies_to_part_id": { "forward": true, "transformation_method_for_set": { "leaf_type": { "object_category": "stock", "object_type": "product" }, "transformation_method": "use_devrev_record" }},
              "owned_by_ids": { "forward": true, "transformation_method_for_set": { "leaf_type": { "object_category": "stock", "object_type": "devu" }, "transformation_method": "use_devrev_record" }},
              "stage": { "forward": true, "transformation_method_for_set": { "enum": "queued", "transformation_method": "use_fixed_value", "value": "enum_value" }},
              "severity": { "forward": true, "transformation_method_for_set": { "enum": "medium", "transformation_method": "use_fixed_value", "value": "enum_value" }}
            }
          }
        }]
      },
      "gchat_message": {
        "default_mapping": { "object_category": "stock", "object_type": "comment" },
        "possible_record_type_mappings": [{
          "devrev_leaf_type": "comment", "forward": true, "reverse": false,
          "shard": {
            "devrev_leaf_type": { "object_category": "stock", "object_type": "comment" }, "mode": "create_shard",
            "stock_field_mappings": {
              "body": { "forward": true, "primary_external_field": "text", "transformation_method_for_set": { "transformation_method": "use_directly" }},
              "parent_object_id": { "forward": true, "primary_external_field": "parent_id", "transformation_method_for_set": { "transformation_method": "use_directly" }},
              "created_by_id": { "forward": true, "primary_external_field": "creator", "transformation_method_for_set": { "transformation_method": "use_directly" }}
            }
          }
        }]
      },
      "gchat_user": {
        "default_mapping": { "object_category": "stock", "object_type": "devu" },
        "possible_record_type_mappings": [{
          "devrev_leaf_type": "devu", "forward": true, "reverse": false,
          "shard": {
            "devrev_leaf_type": { "object_category": "stock", "object_type": "devu" }, "mode": "create_shard",
            "stock_field_mappings": {
              "display_name": { "forward": true, "primary_external_field": "displayName", "transformation_method_for_set": { "transformation_method": "use_directly" }},
              "email": { "forward": true, "primary_external_field": "email", "transformation_method_for_set": { "transformation_method": "use_directly" }}
            }
          }
        }]
      }
    }
  }
}`

### **3.4. Implementing the Google Chat API Client (`src/functions/external-system/http-client.ts`)**

TypeScript

`import { AirdropEvent } from '@devrev/ts-adaas';
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

  async listSpaces(): Promise<any[]> {
    const response = await axios.get(`${this.apiEndpoint}/spaces`, {
      headers: this.getAuthHeaders(),
    });
    return response.data.spaces || [];
  }

  async listMessages(spaceName: string): Promise<any[]> {
    let allMessages: any[] = [];
    let pageToken: string | undefined = undefined;

    do {
      const url = `${this.apiEndpoint}/${spaceName}/messages?pageSize=1000${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const response = await axios.get(url, { headers: this.getAuthHeaders() });

      if (response.data.messages) {
        allMessages = allMessages.concat(response.data.messages);
      }
      pageToken = response.data.nextPageToken;
    } while (pageToken);

    return allMessages;
  }
}`

### **3.5. Implementing Data Normalization Logic (`src/functions/external-system/data-normalization.ts`)**

TypeScript

`import { NormalizedItem, ExternalSyncUnit } from '@devrev/ts-adaas';

export function normalizeSpace(space: any): ExternalSyncUnit {
  return {
    id: space.name,
    name: space.displayName,
    description: space.spaceDetails?.description || 'A Google Chat Space',
    item_count: -1,
  };
}

export function normalizeUser(user: any): NormalizedItem {
  const now = new Date().toISOString();
  return {
    id: user.name,
    created_date: now,
    modified_date: now,
    data: {
      email: user.email,
      displayName: user.displayName,
    },
  };
}

export function normalizeMessage(message: any, threadId: string): NormalizedItem {
  return {
    id: message.name,
    created_date: message.createTime,
    modified_date: message.lastUpdateTime || message.createTime,
    data: {
      text: [message.text],
      creator: message.sender.name,
      parent_id: threadId,
    },
  };
}

export function normalizeThread(firstMessage: any): NormalizedItem {
  return {
    id: firstMessage.thread.name,
    created_date: firstMessage.createTime,
    modified_date: firstMessage.lastUpdateTime || firstMessage.createTime,
    data: {
      title: firstMessage.text.substring(0, 100),
      body: [firstMessage.text],
      space_id: firstMessage.space.name,
    },
  };
}`

### **3.6. Implementing the Extraction Logic**

**`src/functions/extraction/workers/external-sync-units-extraction.ts`**

TypeScript

`import { ExternalSyncUnit, ExtractorEventType, processTask } from '@devrev/ts-adaas';
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
      error: { message: 'Failed to extract Google Chat spaces. Lambda timeout.' },
    });
  },
});`

**`src/functions/extraction/workers/data-extraction.ts`**

TypeScript

`import { ExtractorEventType, processTask } from '@devrev/ts-adaas';
import { normalizeMessage, normalizeThread, normalizeUser } from '../../external-system/data-normalization';
import { HttpClient } from '../../external-system/http-client';
import { ExtractorState } from '../index';

const repos = [
  { itemType: 'gchat_thread' },
  { itemType: 'gchat_message' },
  { itemType: 'gchat_user' },
];

processTask<ExtractorState>({
  task: async ({ adapter }) => {
    adapter.initializeRepos(repos);
    const httpClient = new HttpClient(adapter.event);

    const spaceName = adapter.event.payload.event_context.sync_unit;
    const allMessages = await httpClient.listMessages(spaceName);

    const threadsMap = new Map<string, any[]>();
    const usersMap = new Map<string, any>();

    for (const message of allMessages) {
      if (!message.text || !message.thread?.name) continue;
      const threadId = message.thread.name;
      if (!threadsMap.has(threadId)) {
        threadsMap.set(threadId, []);
      }
      threadsMap.get(threadId)?.push(message);

      if (!usersMap.has(message.sender.name)) {
        usersMap.set(message.sender.name, message.sender);
      }
    }

    for (const [threadId, messages] of threadsMap.entries()) {
      messages.sort((a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime());
      const firstMessage = messages[0];
      const threadItem = normalizeThread(firstMessage);
      await adapter.getRepo('gchat_thread')?.push([threadItem]);
      const messageItems = messages.map((msg) => normalizeMessage(msg, threadId));
      await adapter.getRepo('gchat_message')?.push(messageItems);
    }

    const userItems = Array.from(usersMap.values()).map((user) => normalizeUser(user));
    if (userItems.length > 0) {
      await adapter.getRepo('gchat_user')?.push(userItems);
    }

    await adapter.emit(ExtractorEventType.ExtractionDataDone);
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionDataProgress);
  },
});`

---

### **4.0 Deployment and Usage Guide**

### **4.1. Local Testing with Fixtures (Recommended)**

Before deploying, create a test fixture file in `src/fixtures/` (e.g., `gchat-fixture.json`) with a sample payload and run it using the `test-runner.ts` script to validate your logic locally.

### **4.2. Deploying the Snap-in to your DevRev Organization**

1. Authenticate your DevRev CLI.
2. From the project's root directory, run `make deploy` or `devrev snap_in_version create-one --manifest ./manifest.yaml --create-package`.

### **4.3. User Guide: Running the Airdrop**

### 4.3.1. Step 1: Creating the Google Chat Connection

1. In DevRev, navigate to **Settings > Integrations > Airdrops**.
2. Go to the **Connections** tab and click **Create Connection**.
3. Select the "Google Chat Connection" type.
4. You will be redirected to Google to authenticate and authorize the connection. Sign in and grant the requested permissions.

### 4.3.2. Step 2: Initiating the First Import

1. Navigate back to the
    
    **Airdrops** tab and click **Start Airdrop**.
    
2. Select your "Google Chat Import" from the list.
3. Choose the connection you just created.
4. The snap-in will fetch and display a list of your Google Chat Spaces. Select the one you want to import and click **Continue**.
5. You will be taken to the mapping screen. Since we provided a comprehensive `initial_domain_mapping.json`, the defaults should be correct. Review and proceed.
6. The import will start.

### 4.3.3. Step 3: Verifying the Imported Data in DevRev

Once the import is complete, navigate to your work items list. You will find new Tickets created from the threads in your selected Google Chat Space. Clicking on a ticket will reveal the subsequent messages as comments.

### **4.4. Scheduling Ongoing Synchronization**

After the initial import, you can configure the Airdrop to run on a periodic schedule (e.g., every hour) to automatically pull in new messages and keep DevRev in sync.

---

### **5.0 Troubleshooting**

### **5.1. Deployment Error: `unknown field: keyring_types`**

- **Cause**: Your DevRev CLI version is outdated and does not support the modern `keyring_types` feature in the manifest.
- **Solution**: This documentation and code are incompatible with the latest public CLI (`v0.4.11`). You must contact DevRev support to get a compatible combination of the CLI tool and the snap-in template.

### **5.2. Installation Error: Homebrew Upgrade Fails**

- **Cause**: Running `brew upgrade devrev` fails because DevRev does not use a standard Homebrew tap for updates.
- **Solution**: Follow the official installation guide in Section 2.3 of this document, which involves using `wget` to download the formula directly.

### **5.3. Installation Error: `Repository not found`**

- **Cause**: Attempting to use a standard Homebrew tap name like `devrev/tap` which does not exist.
- **Solution**: Use the direct download method specified in Section 2.3.

### **5.4. Runtime Error: `403 Forbidden`**

- **Cause**: The OAuth scopes configured in your GCP project do not match what the API call requires, or they were not approved by the user during the connection process.
- **Solution**: Verify that the `https://www.googleapis.com/auth/chat.messages.readonly` and `https://www.googleapis.com/auth/chat.spaces.readonly` scopes are enabled on your GCP OAuth Consent Screen.

### **5.5. Viewing Snap-in Logs**

To debug runtime issues, you can retrieve logs for your snap-in using the DevRev CLI.

Bash

`devrev snap_in_package logs | jq`

---

### **6.0 Appendix**

### **6.1. Appendix A: Full Source Code Listings**

All required source code is listed in Section 3.0 of this document.

### **6.2. Appendix B: Google Chat API Endpoints & Scopes Reference**

- **Scopes Used**:
    - `https://www.googleapis.com/auth/chat.messages.readonly`
    - `https://www.googleapis.com/auth/chat.spaces.readonly`
- **API Endpoints Used**:
    - `GET https://chat.googleapis.com/v1/spaces`
    - `GET https://chat.googleapis.com/v1/spaces/{spaceName}/messages`
- **Authentication**: OAuth 2.0 Bearer Token.
