import { createContext } from 'react';

export interface BangumiData {
  siteMeta: Record<string, Site>;
  items: Item[];
}

export interface Site {
  title: string;
  type: 'info' | 'onair' | 'resource';
  urlTemplate: string;
}

export interface Item {
  title: string;
  titleTranslate: Record<'zh-Hans' | 'en', string[]>;
  type: 'tv' | 'movie' | 'ova' | 'web';
  sites: {
    site: Site['title'];
    id: string;
  }[];
  officialSite: string;
  begin: string;
  broadcast?: string;
  end?: string;
  comment?: string;
  lang: string;
  key: string;
}

export const bangumiContext = createContext<{
  originData: BangumiData;
  data: BangumiData;
  setData: (data: BangumiData) => void;
}>(null);
