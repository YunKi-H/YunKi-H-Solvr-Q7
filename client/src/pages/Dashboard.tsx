import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface DashboardData {
  monthlyData: Array<{
    month: string;
    [key: string]: string | number;
  }>;
  weekdayData: Array<{
    name: string;
    value: number;
  }>;
  releaseTypeData: Array<{
    name: string;
    value: number;
  }>;
  statistics: {
    totalReleases: number;
    preReleases: number;
    averageReleaseInterval: number;
  };
  repositories: string[];
}

const TYPE_COLORS = ['#0088FE', '#00C49F', '#FFBB28'];
const CHART_COLORS = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe',
  '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
];

const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/data?startDate=${startDate}&endDate=${endDate}&repository=${selectedRepo}`
        );
        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }
        const jsonData = await response.json();
        setData(jsonData);
      } catch (err) {
        console.error('데이터 로딩 에러:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 에러가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate, selectedRepo]);

  if (loading) {
    return <Typography>데이터를 불러오는 중...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (!data) {
    return <Typography>데이터가 없습니다.</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        릴리스 대시보드
      </Typography>

      {/* 필터 섹션 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>레포지토리</InputLabel>
          <Select
            value={selectedRepo}
            label="레포지토리"
            onChange={(e) => setSelectedRepo(e.target.value)}
          >
            <MenuItem value="all">전체</MenuItem>
            {data.repositories.map(repo => (
              <MenuItem key={repo} value={repo}>{repo}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          label="시작일"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="종료일"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />
      </Box>

      <Box sx={{ display: 'grid', gap: 3 }}>
        <Box>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                레포지토리별 월별 릴리스 수
              </Typography>
              <div style={{ width: '100%', height: 400 }}>
                <ResponsiveContainer>
                  <LineChart data={data.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="month" 
                      tickFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return `${year}년 ${month}월`;
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(value) => {
                        const [year, month] = value.split('-');
                        return `${year}년 ${month}월`;
                      }}
                    />
                    <Legend />
                    {data.repositories.map((repo, index) => (
                      <Line
                        key={repo}
                        type="monotone"
                        dataKey={repo}
                        name={repo?.split('/')?.[1] || repo}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        activeDot={{ r: 8 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  요일별 릴리스 분포
                </Typography>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.weekdayData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Box>

          <Box>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  릴리스 타입 분석
                </Typography>
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={data.releaseTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.releaseTypeData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </Box>
        </Box>

        <Box>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                전체 통계
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                <Box>
                  <Typography variant="subtitle1">총 릴리스 수</Typography>
                  <Typography variant="h4">{data.statistics.totalReleases}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1">프리릴리스</Typography>
                  <Typography variant="h4">
                    {data.statistics.preReleases}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1">평균 릴리스 간격</Typography>
                  <Typography variant="h4">
                    {data.statistics.averageReleaseInterval}일
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard; 