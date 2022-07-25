import React, { FC, useContext, useEffect, useState } from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useUpdateEffect } from 'ahooks';
import { bangumiContext } from '../source/bangumi/context';
import dayjs from 'dayjs';

const ITEM_HEIGHT = 48;
const ITEM_PADDING_TOP = 8;
const MenuProps = {
  PaperProps: {
    style: {
      maxHeight: ITEM_HEIGHT * 4.5 + ITEM_PADDING_TOP,
      width: 250,
    },
  },
};

const BangumiFilter: FC = () => {
  const { register, getValues, control } = useForm();
  const { originData, setData } = useContext(bangumiContext);
  const [weekday, setWeekday] = useState(dayjs().day());
  useEffect(() => {
    setData({
      ...originData,
      items:
        originData?.items.filter((item) =>
          weekday ? dayjs(item.begin).day() === weekday : true
        ) || [],
    });
  }, [weekday, originData]);
  const consoleValue = () => {};
  return (
    <Stack spacing={2}>
      {/* <Box component='form' onChange={consoleValue}>
        <TextField
          label='番剧名'
          variant='outlined'
          {...register('test')}
        ></TextField>
        <Controller
          name='site'
          control={control}
          defaultValue={[]}
          render={({ field }) => (
            <FormControl variant='outlined' sx={{ width: '120px' }}>
              <InputLabel>放送站点</InputLabel>
              <Select
                label='放送站点'
                multiple={true}
                MenuProps={MenuProps}
                {...field}
              >
                {data &&
                  Object.entries(data.siteMeta).map(([key, item]) => (
                    <MenuItem key={key} value={key}>{`${item.title}`}</MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}
        ></Controller>
      </Box> */}
      <Tabs
        value={weekday}
        variant='scrollable'
        scrollButtons='auto'
        onChange={(_, v) => setWeekday(v)}
      >
        {'.'
          .repeat(7)
          .split('')
          .map((_, i) => {
            return (
              <Tab
                key={i}
                label={
                  dayjs().day(i).day() === dayjs().day()
                    ? '今天'
                    : dayjs().day(i).format('ddd')
                }
                value={i}
              />
            );
          })}
      </Tabs>
    </Stack>
  );
};

export default BangumiFilter;
