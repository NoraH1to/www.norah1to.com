import {
  Card,
  CardContent,
  Typography,
  Grid,
  Tooltip,
  Link,
  Divider,
  Box,
} from '@mui/material';
import clsx from 'clsx';
import dayjs from 'dayjs';
import React, { FC, useContext, useMemo } from 'react';
import { Item, Site } from '../source/bangumi/context'

const BangumiMeta: FC<{
  prop: string | number;
  value: string | { label: string; value: string }[];
}> = ({ prop, value }) => (
  <Typography color='text.secondary'>
    {`${prop} `}
    {typeof value !== 'string' ? (
      value.length === 0 ? (
        <Typography component='span' color='text.primary'>
          无
        </Typography>
      ) : (
        value.map((value, i, arr) => (
          <React.Fragment key={value.value + value.label + 'split'}>
            {i !== 0 && arr.length > 1 && (
              <Box component='span' sx={{ userSelect: 'none' }}>
                {' / '}
              </Box>
            )}
            <Link color='text.primary' href={value.value} target='_blank'>
              {value.label}
            </Link>
          </React.Fragment>
        ))
      )
    ) : (
      <Typography component='span' color='text.primary'>
        {value}
      </Typography>
    )}
  </Typography>
);

const BangumiCard: FC<{ item: Item; siteMeta: Record<string, Site> }> = ({
  item,
  siteMeta,
}) => {
  const title = useMemo(
    () => item?.titleTranslate?.['zh-Hans']?.[0] || item.title,
    [item]
  );
  const subTitle = useMemo(
    () => item.title || item?.titleTranslate?.['zh-Hans']?.[0],
    [item]
  );
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Tooltip title={title}>
          <Typography variant='h5' noWrap>
            {title}
          </Typography>
        </Tooltip>
        <Tooltip title={subTitle}>
          <Typography
            variant='body1'
            noWrap
            color='text.secondary'
            gutterBottom
          >
            {subTitle}
          </Typography>
        </Tooltip>
        <BangumiMeta
          prop={'开播'}
          value={dayjs(item.begin).format('YYYY-MM-DD')}
        />
        <BangumiMeta
          prop={'信息'}
          value={item.sites
            .filter((site) => siteMeta[site.site].type === 'info')
            .map((site) => ({
              label: siteMeta[site.site].title,
              value: siteMeta[site.site].urlTemplate.replace('{{id}}', site.id),
            }))}
        />
        <BangumiMeta
          prop={'放送'}
          value={item.sites
            .filter((site) => siteMeta[site.site].type === 'onair')
            .map((site) => ({
              label: siteMeta[site.site].title,
              value: siteMeta[site.site].urlTemplate.replace('{{id}}', site.id),
            }))}
        />
      </CardContent>
    </Card>
  );
};

const BangumiList: FC<{ list: Item[]; siteMeta: Record<string, Site> }> = ({
  list,
  siteMeta,
}) => {
  if (list.length) {
    return (
      <Grid container spacing={2}>
        {list.map((item) => (
          <Grid key={item.key} item xs={12} sm={6} md={4} lg={3}>
            <BangumiCard item={item} siteMeta={siteMeta}></BangumiCard>
          </Grid>
        ))}
      </Grid>
    );
  }
  return <div>无</div>;
};

export default BangumiList;
