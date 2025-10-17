'use client';

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { ChartItem } from '@/types/cachedCharts';

interface CustomizedLabelProps {
  x?: number;
  y?: number;
  stroke?: string;
  value?: string | number;
}

const CustomizedLabel: React.FC<CustomizedLabelProps> = ({
  x,
  y,
  stroke,
  value,
}) => {
  if (x === undefined || y === undefined || value === undefined) return null;
  return (
    <text x={x} y={y} dy={-4} fill={stroke} fontSize={10} textAnchor="middle">
      {value}
    </text>
  );
};

interface CustomizedAxisTickProps {
  x?: number;
  y?: number;
  stroke?: string;
  payload?: { value: string | number };
}

const CustomizedAxisTick: React.FC<CustomizedAxisTickProps> = ({
  x,
  y,
  payload,
}) => {
  if (x === undefined || y === undefined || !payload) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#666"
        transform="rotate(-35)"
      >
        {payload.value}
      </text>
    </g>
  );
};

interface DualLineProps<TData> {
  chart: ChartItem<TData>;
}

const DualLine = <TData,>({ chart }: DualLineProps<TData>) => {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        width={500}
        height={300}
        data={chart.data}
        margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey={chart.xField}
          height={60}
          tick={<CustomizedAxisTick />}
        />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey={chart.chartParams?.datakey ?? 'joe '}
          stroke="#8884d8"
          label={<CustomizedLabel />}
        />
        <Line type="monotone" dataKey={chart.yField} stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  );
};
export default DualLine;
