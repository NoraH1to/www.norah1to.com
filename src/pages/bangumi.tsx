import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import Layout from '@theme/Layout';
import BangumiList from '@site/src/components/BangumiList';
import { useColorMode } from '@docusaurus/theme-common';
import { useRequest, useUpdateEffect } from 'ahooks';
import { dataSource } from '../source/bangumi/config';
import BangumiFilter from '@site/src/components/BangumiFilter';
import {
  Backdrop,
  CircularProgress,
  createTheme,
  ThemeProvider,
  Typography,
} from '@mui/material';
import { bangumiContext, BangumiData } from '../source/bangumi/context';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn';

dayjs.locale('zh-cn');
var relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime);

const CURRENT_DATE = dayjs();

const BangumiContent: FC = () => {
  const { colorMode } = useColorMode();
  const { data: rawData, loading } = useRequest<BangumiData | null, undefined>(
    async () => (await fetch(dataSource, { method: 'GET' })).json()
  );
  const [data, setData] = useState(rawData);
  const [originData, setOriginData] = useState(data);
  useUpdateEffect(() => {
    if (!rawData?.items?.length) {
      setData(rawData);
    }
    const newData = {
      ...rawData,
      items: rawData.items
        .concat([])
        .filter(
          (value) =>
            value.type === 'tv' &&
            !value.end &&
            value.begin &&
            dayjs(value.begin).year() - CURRENT_DATE.year() >= -1
        )
        .map((value) => ({
          ...value,
          key: `${value.title}-${value.lang}-${value.type}-${value.begin}-${value.end}`,
        }))
        .sort((a, b) => dayjs(b.begin).diff(dayjs(a.begin), 'day')),
    };
    setOriginData(newData);
    setData(newData);
  }, [rawData]);
  return (
    <ThemeProvider
      theme={createTheme({
        palette: {
          mode: colorMode,
          primary: {
            main: '#25c2a0',
            light: 'rgb(70, 203, 174)',
            dark: 'rgb(33, 175, 144)',
          },
        },
      })}
    >
      <bangumiContext.Provider value={{ originData, data, setData }}>
        {loading ? (
          <Backdrop open>
            <CircularProgress />
          </Backdrop>
        ) : (
          <div className='container margin-vert--md'>
            <div className='margin-bottom--md'>
              <Typography variant='h4'>番剧时间表</Typography>
            </div>
            <div className='margin-bottom--md'>
              <BangumiFilter />
            </div>
            <div>
              <BangumiList
                list={data?.items || []}
                siteMeta={data?.siteMeta || {}}
              />
            </div>
          </div>
        )}
      </bangumiContext.Provider>
    </ThemeProvider>
  );
};

const Bangumi: FC = () => {
  return (
    <Layout>
      <BangumiContent />
    </Layout>
  );
};

export default Bangumi;
