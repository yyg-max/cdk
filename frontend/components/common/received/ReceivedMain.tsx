'use client';

import {useState, useEffect, useCallback} from 'react';
import {toast} from 'sonner';
import {Skeleton} from '@/components/ui/skeleton';
import {Separator} from '@/components/ui/separator';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table';
import {DataChart, DataTable} from '@/components/common/received';
import services from '@/lib/services';
import {ReceiveHistoryItem, ReceiveHistoryChartPoint} from '@/lib/services/project/types';
import {motion} from 'motion/react';
import {useDebounce} from '@/hooks/use-debounce';

const PAGE_SIZE = 20;

/**
 * 数据图表骨架屏组件
 */
const DataChartSkeleton = () => {
  const chartBarHeights = [60, 35, 50, 25, 30, 55, 45];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({length: 4}).map((_, i) => (
          <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <Skeleton className="h-3 w-8 mb-1" />
            <Skeleton className="h-[18px] w-12" />
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        <div className="py-2">
          <div className="h-[300px] w-full flex items-center justify-center">
            <div className="w-full max-w-full px-8">
              <div className="flex items-end justify-between h-48 gap-4">
                {chartBarHeights.map((height, i) => (
                  <div key={i} className="flex flex-col items-center space-y-2">
                    <Skeleton
                      className="w-8 bg-blue-100 dark:bg-blue-900/20"
                      style={{height: `${height}px`}}
                    />
                    <Skeleton className="h-3 w-8" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * 数据表格骨架屏组件
 */
const DataTableSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-48" />
    </div>

    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[140px]">
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead className="w-[100px]">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead>
              <Skeleton className="h-4 w-20" />
            </TableHead>
            <TableHead className="w-[120px]">
              <Skeleton className="h-4 w-16" />
            </TableHead>
            <TableHead className="text-right w-[60px]">
              <Skeleton className="h-4 w-12 ml-auto" />
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({length: 10}).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end space-x-1">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-6 w-6" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>

    <div className="flex items-center justify-between px-2">
      <Skeleton className="h-4 w-20" />
      <div className="flex items-center space-x-1">
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-7 w-7" />
      </div>
    </div>
  </div>
);

/**
 * 我的领取页面主组件
 */
export function ReceivedMain() {
  const [chartData, setChartData] = useState<ReceiveHistoryChartPoint[]>([]);
  const [tableData, setTableData] = useState<ReceiveHistoryItem[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [chartLoading, setChartLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebounce(searchInput, 500);
  const [chartDay, setChartDay] = useState(7);

  /**
   * 获取图表数据
   */
  const fetchChartData = async (day: number) => {
    try {
      setChartLoading(true);

      const result = await services.project.getReceiveHistoryChartSafe({
        day,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || '获取图表数据失败');
      }

      setChartData(result.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取图表数据失败');
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData(chartDay);
  }, [chartDay]);

  /**
   * 获取表格数据
   */
  const fetchTableData = async (page: number, search: string) => {
    try {
      setTableLoading(true);

      const result = await services.project.getReceiveHistorySafe({
        current: page,
        size: PAGE_SIZE,
        search,
      });

      if (!result.success || !result.data) {
        throw new Error(result.error || '获取表格数据失败');
      }

      setTableData(result.data.results || []);
      setTotalItems(result.data.total);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '获取表格数据失败');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchTableData(currentPage, debouncedSearch);
  }, [currentPage, debouncedSearch]);

  const containerVariants = {
    hidden: {opacity: 0},
    visible: {
      opacity: 1,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1,
        ease: 'easeOut',
      },
    },
  };

  const itemVariants = {
    hidden: {opacity: 0, y: 20},
    visible: {
      opacity: 1,
      y: 0,
      transition: {duration: 0.6, ease: 'easeOut'},
    },
  };

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">我的领取</h1>
          <p className="text-muted-foreground mt-1">
            查看您已领取的分发项目信息和内容
          </p>
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Separator className="my-8" />
      </motion.div>

      <motion.div className="space-y-6" variants={itemVariants}>
        {chartLoading ? (
          <DataChartSkeleton />
        ) : (
          <DataChart data={chartData} selectedDay={chartDay} onRangeChange={setChartDay} />
        )}

        <Separator className="my-8" />

        {tableLoading ? (
          <DataTableSkeleton />
        ) : (
          <DataTable
            data={tableData}
            currentPage={currentPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
            searchTerm={searchInput}
            onSearchChange={handleSearchChange}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
