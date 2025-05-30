// import { DevonianClient, DevonianIndex, ForeignIds } from 'devonian';
import { DevonianClient, ForeignIds } from 'devonian';
import { Agent } from 'undici';
import {
  Fetcher,
  graph,
  UpdateManager,
  AutoInitOptions,
  IndexedFormula,
  sym,
  Namespace,
  // isNamedNode,
  st,
} from 'rdflib';
// import { executeUpdate } from "@solid-data-modules/rdflib-utils";
import ChatsModuleRdfLib, {
  ChatsModule,
} from '@solid-data-modules/chats-rdflib';
// import { Tub, SolidChatMessage } from './tub.js';
// import { ChannelDrop, AuthorDrop } from './drops.js';
// import { fetchTracker } from './solid/tasks.js';
import { getFetcher } from './solid/fetcher.js';

const owl = Namespace('http://www.w3.org/2002/07/owl#');

function solidSameasToForeignIds(sameAs: string[]): ForeignIds {
  const ret: { [platform: string]: string } = {};
  sameAs.forEach((uri: string) => {
    if (uri.startsWith(`https://tubsproject.org/id/message/`)) {
      const rest = (uri.substring(`https://tubsproject.org/id/message/`.length));
      const parts = rest.split('/');
      if (parts.length === 2) {
        ret[parts[0]] = parts[1]
      }
    }
  });
  console.log('converted sameAs uris', sameAs, ret);
  return ret;
}

function getTodayDoc(chatUri: string): string {
  // FIXME: expose this code from https://github.com/solid-contrib/data-modules/blob/main/chats/rdflib/src/module/uris/mintMessageUri.ts
  if (!chatUri.endsWith('index.ttl#this')) {
    throw new Error(
      `Chat URI ${chatUri} does not end with the expected index.ttl#this, is it really the URI of a LongChat?`,
    );
  }
  // note that this relies on server clocks being in sync
  const date = new Date();
  const dateFolders = date.toISOString().split('T')[0].replace(/-/g, '/');
  const containerUri = chatUri.substring(
    0,
    chatUri.length - `index.ttl#this`.length,
  );
  return containerUri + dateFolders + '/chat.ttl';
}

export type SolidMessage = {
  uri?: string,
  chatUri: string,
  text: string,
  authorWebId: string,
  date?: Date,
  foreignIds: ForeignIds,
};

export class SolidMessageClient extends DevonianClient<SolidMessage> {
  // private index: DevonianIndex;
  fetch: typeof globalThis.fetch;
  store: IndexedFormula;
  fetcher: Fetcher;
  updater: UpdateManager;
  module: ChatsModule;
  // constructor(index: DevonianIndex) {
  constructor() {
    super();
    // this.index = index;
  }
  async connect(): Promise<void> {
    console.log(`Connecting to Solid...`);
    this.fetch = await getFetcher();
    this.store = graph();
    this.updater = new UpdateManager(this.store);
    this.fetcher = new Fetcher(this.store, {
      fetch: this.fetch,
    } as AutoInitOptions);
    this.module = new ChatsModuleRdfLib({
      store: this.store,
      fetcher: this.fetcher,
      updater: this.updater,
    });
    const todayDoc = getTodayDoc(process.env.CHANNEL_IN_SOLID);
    // FIXME: discover this URL from the response header link:
    const streamingUrl = `https://solidcommunity.net/.notifications/StreamingHTTPChannel2023/${encodeURIComponent(todayDoc)}`;
    const res = await this.fetch(streamingUrl, {
      dispatcher: new Agent({ bodyTimeout: 0 }),
    } as RequestInit);
    for await (const _notificationText of res.body.pipeThrough(new TextDecoderStream()) as unknown as {
      [Symbol.asyncIterator](): AsyncIterableIterator<string>;
    }) {
      void _notificationText;
      await this.fetcher.load(sym(todayDoc), { force: true });
      const chat = await this.module.readChat(process.env.CHANNEL_IN_SOLID);
      chat.latestMessages.map((entry) => {
        this.emit('add-from-client', Object.assign(entry, {
          chatUri: process.env.CHANNEL_IN_SOLID,
          foreignIds: solidSameasToForeignIds(this.store.each(
            sym(entry.uri),
            owl('sameAs'),
            null,
            sym(entry.uri).doc(),
          ).map((node) => node.value))
        }));
      });
    }
  }
  async add(obj: SolidMessage): Promise<string> {
    const uri = await this.module.postMessage(obj);
    console.log('posted to Solid', obj, uri);
    const promises = Object.keys(obj.foreignIds).map(async (platform) => {
        const messageNode = sym(uri);
        await this.updater.updateMany(
          [],
          [
            st(
              messageNode,
              owl('sameAs'),
              sym(`https://tubsproject.org/id/message/${platform}/${obj.foreignIds[platform]}`),
              messageNode.doc(),
            ),
          ],
        );
      });
      await Promise.all(promises);
    return uri;
  }
}