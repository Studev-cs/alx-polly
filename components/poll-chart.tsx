"use client";

import { memo } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  LabelList,
  Cell,
} from "recharts";

interface PollChartProps {
  data: {
    name: string;
    total: number;
  }[];
  barHeight?: number;
}

export const PollChart = memo(({ data, barHeight = 20 }: PollChartProps) => {
  const totalVotes = data.reduce((acc, curr) => acc + curr.total, 0);

  // Transform data for the chart with percentage calculations
  const chartData = data.map((item) => {
    const percentage = totalVotes > 0 ? (item.total / totalVotes) * 100 : 0;
    return {
      ...item,
      percentage,
      maxValue: 100, // Fixed bar length
    };
  });

  // Function to get color based on vote count ranking
  const getBarColor = (entry: { name: string; total: number }) => {
    if (entry.total === 0) return "#888888"; // Grey for no votes

    // Sort data by vote count to determine ranking
    const sortedData = [...data].sort((a, b) => b.total - a.total);
    const nonZeroOptions = sortedData.filter((item) => item.total > 0);

    if (nonZeroOptions.length === 1) return "#22c55e"; // Green if only one option has votes

    const index = nonZeroOptions.findIndex((item) => item.name === entry.name);
    const totalNonZero = nonZeroOptions.length;

    if (index === 0) return "#22c55e"; // Green for highest
    if (index === totalNonZero - 1) return "#ef4444"; // Red for lowest
    return "#eab308"; // Yellow for medium
  };

  const CustomLabel = (props: any) => {
    const { x, y, width, height, value, index } = props;

    // Get the data from chartData using index
    const dataItem = chartData[index];
    if (!dataItem) return null;

    const percentage = dataItem.percentage || 0;
    const isZero = dataItem.total === 0;

    // Calculate positions
    const titleX = x + 8; // Left aligned with padding
    const filledWidth = (width * percentage) / 100;
    const percentageX = isZero ? x + width / 2 : x + filledWidth / 2;

    return (
      <g>
        {/* Title above the bar */}
        <text
          x={titleX}
          y={y - 8}
          fill="currentColor"
          textAnchor="start"
          dominantBaseline="middle"
          fontSize="14"
          fontWeight="500"
        >
          {dataItem.name}
        </text>

        {/* Percentage in the appropriate position */}
        <text
          x={percentageX}
          y={y + height / 2}
          fill={isZero ? "#666666" : "#ffffff"}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="11"
          fontWeight="500"
        >
          {`${percentage.toFixed(1)}% (${dataItem.total})`}
        </text>
      </g>
    );
  };

  const CustomBar = (props: any) => {
    const { payload, x, y, width, height } = props;
    if (!payload) return null;

    const percentage = payload.percentage || 0;
    const filledWidth = (width * percentage) / 100;

    const barColor = getBarColor({ name: payload.name, total: payload.total });

    return (
      <g>
        {/* Background bar (white/grey) */}
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill="#ffffff"
          stroke="#d1d5db"
          strokeWidth={1}
          rx={4}
          ry={4}
        />

        {/* Filled portion */}
        {filledWidth > 0 && (
          <rect
            x={x}
            y={y}
            width={filledWidth}
            height={height}
            fill={barColor}
            stroke="#d1d5db"
            strokeWidth={1}
            rx={4}
            ry={4}
          />
        )}
      </g>
    );
  };

  return (
    <ResponsiveContainer
      width="100%"
      height={chartData.length * (barHeight + 50)}
    >
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 30, left: 10, right: 10, bottom: 10 }}
      >
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="name" hide />
        <Bar dataKey="maxValue" barSize={barHeight} shape={CustomBar}>
          <LabelList content={CustomLabel} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
});