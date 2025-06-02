import React, { useEffect, useState } from 'react';
import { Card, CardContent, Typography, Box, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';

interface ReleaseData {
  repository: string;
  tag_name: string;
  name: string;
  created_at: string;
  published_at: string;
  created_at_iso: string;
  published_at_iso: string;
  published_year: string;
  published_month: string;
  published_day: string;
  weekday: string;
  is_weekend: string;
  is_draft: string;
  is_prerelease: string;
  release_note_length: string;
  has_release_note: string;
  days_to_publish: string;
}

interface MonthlyData {
  month: string;
  [key: string]: string | number;
}

const Dashboard: React.FC = () => {
  const [data, setData] = useState<ReleaseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(subMonths(new Date(), 11)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/data?startDate=${startDate}&endDate=${endDate}`);
        if (!response.ok) {
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }
        const jsonData = await response.json();
        console.log('API 응답 데이터:', jsonData);
        setData(jsonData);
      } catch (err) {
        console.error('데이터 로딩 에러:', err);
        setError(err instanceof Error ? err.message : '알 수 없는 에러가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [startDate, endDate]);

  // 선택된 레포지토리에 따라 데이터 필터링
  const filteredData = selectedRepo === 'all' 
    ? data 
    : data.filter(item => item.repository === selectedRepo);

  // 모든 레포지토리 목록 가져오기 (원본 데이터에서)
  const repositories = Array.from(new Set(data.map(item => item.repository)));

  // 레포지토리별 월별 릴리스 수 계산
  const monthlyData = filteredData.reduce((acc: { [key: string]: { [key: string]: number } }, curr) => {
    const dateStr = curr.published_at_iso || curr.published_at;
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      console.error('유효하지 않은 날짜:', dateStr);
      return acc;
    }

    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const repo = curr.repository;

    if (!acc[monthKey]) {
      acc[monthKey] = {};
    }
    acc[monthKey][repo] = (acc[monthKey][repo] || 0) + 1;
    return acc;
  }, {});

  // 모든 월 목록 구하기
  const allMonths = Array.from(new Set(filteredData.map(item => {
    const dateStr = item.published_at_iso || item.published_at;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }))).filter((v): v is string => !!v).sort();

  // 월별 데이터 생성 (모든 월-레포지토리 조합에 대해 값이 없으면 0)
  const chartData: MonthlyData[] = allMonths.map(month => {
    const monthData = monthlyData[month] || {};
    const row: MonthlyData = { month };
    repositories.forEach(repo => {
      row[repo] = monthData[repo] || 0;
    });
    return row;
  });

  // 요일별 릴리스 수 계산
  const weekdayData = filteredData.reduce<Record<string, number>>((acc, curr) => {
    const weekday = curr.weekday;
    acc[weekday] = (acc[weekday] || 0) + 1;
    return acc;
  }, {});

  const weekdayChartData = Object.entries(weekdayData).map(([weekday, count]) => ({
    name: ['일', '월', '화', '수', '목', '금', '토'][parseInt(weekday, 10)],
    value: count
  }));

  // 릴리스 타입 분석 데이터
  const releaseTypeData: Array<{ name: string; value: number }> = [
    { name: '일반 릴리스', value: filteredData.filter(item => item.is_prerelease === 'false' && item.is_draft === 'false').length },
    { name: '프리릴리스', value: filteredData.filter(item => item.is_prerelease === 'true').length },
    { name: '초안', value: filteredData.filter(item => item.is_draft === 'true').length }
  ];

  const TYPE_COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  // 차트 색상 배열
  const colors = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe',
    '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
  ];

  // 평균 릴리스 간격 계산
  const sortedDates = filteredData
    .map(item => new Date(item.published_at_iso || item.published_at))
    .filter(date => !isNaN(date.getTime()))
    .sort((a, b) => a.getTime() - b.getTime());

  const averageReleaseInterval = sortedDates.length > 1
    ? Math.round(
        (sortedDates[sortedDates.length - 1].getTime() - sortedDates[0].getTime()) /
        (1000 * 60 * 60 * 24 * (sortedDates.length - 1))
      )
    : 0;

  if (loading) {
    return <Typography>데이터를 불러오는 중...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (chartData.length === 0) {
    return <Typography>표시할 데이터가 없습니다.</Typography>;
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
            {Array.from(new Set(data.map(item => item.repository))).map(repo => (
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
                  <LineChart data={chartData}>
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
                    {repositories.map((repo, index) => (
                      <Line
                        key={repo}
                        type="monotone"
                        dataKey={repo}
                        name={repo?.split('/')?.[1] || repo}
                        stroke={colors[index % colors.length]}
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
                    <BarChart data={weekdayChartData}>
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
                        data={releaseTypeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {releaseTypeData.map((_, index) => (
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
                  <Typography variant="h4">{filteredData.length}</Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1">프리릴리스</Typography>
                  <Typography variant="h4">
                    {filteredData.filter(item => item.is_prerelease === 'true').length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="subtitle1">평균 릴리스 간격</Typography>
                  <Typography variant="h4">
                    {averageReleaseInterval}일
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