import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Download, Calendar as CalendarIcon, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format, subMonths, startOfDay, endOfDay, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from '@/components/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface OrderAnalytics {
  date: string;
  totalOrders: number;
  totalRevenue: number;
}

interface ItemAnalytics {
  itemName: string;
  quantity: number;
  revenue: number;
}

interface DetailedOrder {
  id: string;
  original_order_id: string;
  created_at: string;
  printed_at: string;
  total_amount: number;
  table_id: string | null;
  session_code: string | null;
  user_name: string | null;
  items: {
    item_name: string;
    quantity: number;
    price: number;
    variant_name: string | null;
  }[];
  payment_mode?: string | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

const Analytics = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState<Date>(startOfDay(subMonths(new Date(), 3)));
  const [endDate, setEndDate] = useState<Date>(endOfDay(new Date()));
  const [orderAnalytics, setOrderAnalytics] = useState<OrderAnalytics[]>([]);
  const [itemAnalytics, setItemAnalytics] = useState<ItemAnalytics[]>([]);
  const [detailedOrders, setDetailedOrders] = useState<DetailedOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hourlyAnalytics, setHourlyAnalytics] = useState<any[]>([]);
  const [tableAnalytics, setTableAnalytics] = useState<any[]>([]);

  useEffect(() => {
    if (startDate && endDate) {
      fetchAnalytics();
    }
  }, [restaurantId, startDate, endDate]);

  const fetchAnalytics = async () => {
    if (!startDate || !endDate) {
      toast.error('Please select valid start and end dates');
      return;
    }

    try {
      setIsLoading(true);

      // Fetch orders from analytics_orders table
      const { data: orders, error: ordersError } = await supabase
        .from('analytics_orders')
        .select(`
          id,
          original_order_id,
          created_at,
          printed_at,
          total_amount,
          table_id,
          session_code,
          user_name,
          items,
          payment_mode
        `)
        .eq('restaurant_id', restaurantId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      // Process order analytics
      const dailyAnalytics = new Map<string, { totalOrders: number; totalRevenue: number }>();
      const hourlyAnalyticsMap = new Map<string, { totalOrders: number; totalRevenue: number }>();
      const tableAnalyticsMap = new Map<string, { totalOrders: number; totalRevenue: number }>();
      
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        const hour = format(new Date(order.created_at), 'HH:00');
        const tableId = order.table_id || 'No Table';
        
        // Daily analytics
        const currentDaily = dailyAnalytics.get(date) || { totalOrders: 0, totalRevenue: 0 };
        dailyAnalytics.set(date, {
          totalOrders: currentDaily.totalOrders + 1,
          totalRevenue: currentDaily.totalRevenue + order.total_amount,
        });

        // Hourly analytics
        const currentHourly = hourlyAnalyticsMap.get(hour) || { totalOrders: 0, totalRevenue: 0 };
        hourlyAnalyticsMap.set(hour, {
          totalOrders: currentHourly.totalOrders + 1,
          totalRevenue: currentHourly.totalRevenue + order.total_amount,
        });

        // Table analytics
        const currentTable = tableAnalyticsMap.get(tableId) || { totalOrders: 0, totalRevenue: 0 };
        tableAnalyticsMap.set(tableId, {
          totalOrders: currentTable.totalOrders + 1,
          totalRevenue: currentTable.totalRevenue + order.total_amount,
        });
      });

      const orderAnalyticsData = Array.from(dailyAnalytics.entries()).map(([date, data]) => ({
        date,
        ...data,
      }));

      const hourlyAnalyticsData = Array.from(hourlyAnalyticsMap.entries())
        .map(([hour, data]) => ({
          hour,
          ...data,
        }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      const tableAnalyticsData = Array.from(tableAnalyticsMap.entries())
        .map(([tableId, data]) => ({
          tableId,
          ...data,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue);

      // Process item analytics
      const itemAnalyticsMap = new Map<string, { quantity: number; revenue: number }>();
      
      orders?.forEach(order => {
        order.items?.forEach(item => {
          const current = itemAnalyticsMap.get(item.item_name) || { quantity: 0, revenue: 0 };
          itemAnalyticsMap.set(item.item_name, {
            quantity: current.quantity + item.quantity,
            revenue: current.revenue + (item.price * item.quantity),
          });
        });
      });

      const itemAnalyticsData = Array.from(itemAnalyticsMap.entries())
        .map(([itemName, data]) => ({
          itemName,
          ...data,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10); // Top 10 items by revenue

      setOrderAnalytics(orderAnalyticsData);
      setItemAnalytics(itemAnalyticsData);
      setDetailedOrders(orders || []);
      setHourlyAnalytics(hourlyAnalyticsData);
      setTableAnalytics(tableAnalyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  const exportToCSV = () => {
    try {
      // Prepare order data for CSV
      const orderData = orderAnalytics.map(day => ({
        Date: day.date,
        'Total Orders': day.totalOrders,
        'Total Revenue': day.totalRevenue.toFixed(2),
      }));

      // Prepare item data for CSV
      const itemData = itemAnalytics.map(item => ({
        'Item Name': item.itemName,
        'Quantity Sold': item.quantity,
        'Total Revenue': item.revenue.toFixed(2),
      }));

      // Prepare detailed order data for CSV
      const detailedOrderData = detailedOrders.map(order => ({
        'Order ID': order.id,
        'Date': format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss'),
        'Table': order.table_id || 'N/A',
        'Session': order.session_code || 'N/A',
        'Customer': order.user_name || 'N/A',
        'Total Amount': order.total_amount.toFixed(2),
        'Payment Mode': order.payment_mode || 'N/A',
        'Items': order.items.map(item => 
          `${item.item_name}${item.variant_name ? ` (${item.variant_name})` : ''} x${item.quantity} @$${item.price}`
        ).join('; '),
      }));

      // Convert to CSV
      const orderCSV = [
        Object.keys(orderData[0]).join(','),
        ...orderData.map(row => Object.values(row).join(','))
      ].join('\n');

      const itemCSV = [
        Object.keys(itemData[0]).join(','),
        ...itemData.map(row => Object.values(row).join(','))
      ].join('\n');

      const detailedOrderCSV = [
        Object.keys(detailedOrderData[0]).join(','),
        ...detailedOrderData.map(row => Object.values(row).join(','))
      ].join('\n');

      // Create and download files
      const orderBlob = new Blob([orderCSV], { type: 'text/csv' });
      const itemBlob = new Blob([itemCSV], { type: 'text/csv' });
      const detailedOrderBlob = new Blob([detailedOrderCSV], { type: 'text/csv' });

      const orderUrl = URL.createObjectURL(orderBlob);
      const itemUrl = URL.createObjectURL(itemBlob);
      const detailedOrderUrl = URL.createObjectURL(detailedOrderBlob);

      const orderLink = document.createElement('a');
      orderLink.href = orderUrl;
      orderLink.download = `order-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(orderLink);
      orderLink.click();
      document.body.removeChild(orderLink);

      const itemLink = document.createElement('a');
      itemLink.href = itemUrl;
      itemLink.download = `item-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(itemLink);
      itemLink.click();
      document.body.removeChild(itemLink);

      const detailedOrderLink = document.createElement('a');
      detailedOrderLink.href = detailedOrderUrl;
      detailedOrderLink.download = `detailed-orders-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(detailedOrderLink);
      detailedOrderLink.click();
      document.body.removeChild(detailedOrderLink);

      toast.success('Analytics data exported successfully');
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export analytics data');
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "PPP") : "Start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(date) => date && setStartDate(startOfDay(date))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[200px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "PPP") : "End date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(date) => date && setEndDate(endOfDay(date))}
                  initialFocus
                  disabled={(date) => date < startDate}
                />
              </PopoverContent>
            </Popover>
          </div>

          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>

          <Button onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        <>
          <Tabs defaultValue="overview" className="mb-8">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="items">Items</TabsTrigger>
              <TabsTrigger value="tables">Tables</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {orderAnalytics.reduce((sum, day) => sum + day.totalOrders, 0)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      ${orderAnalytics.reduce((sum, day) => sum + day.totalRevenue, 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Average Order Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      ${(orderAnalytics.reduce((sum, day) => sum + day.totalRevenue, 0) /
                        orderAnalytics.reduce((sum, day) => sum + day.totalOrders, 0) || 0).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Orders & Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={orderAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="totalOrders"
                            stroke="#8884d8"
                            name="Orders"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="totalRevenue"
                            stroke="#82ca9d"
                            name="Revenue"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Hourly Order Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={hourlyAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="hour" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="totalOrders" fill="#8884d8" name="Orders" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="orders">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Detailed Order History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Session</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Payment Mode</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailedOrders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-medium">{order.original_order_id}</TableCell>
                            <TableCell>{format(new Date(order.created_at), 'yyyy-MM-dd HH:mm:ss')}</TableCell>
                            <TableCell>{order.table_id || 'N/A'}</TableCell>
                            <TableCell>{order.session_code || 'N/A'}</TableCell>
                            <TableCell>{order.user_name || 'N/A'}</TableCell>
                            <TableCell>{order.payment_mode || 'N/A'}</TableCell>
                            <TableCell>
                              <div className="max-w-md">
                                {order.items.map((item, index) => (
                                  <div key={index} className="text-sm">
                                    {item.item_name}
                                    {item.variant_name && ` (${item.variant_name})`} x{item.quantity} @${item.price}
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">${order.total_amount.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="items">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Items by Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={itemAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="itemName" angle={-45} textAnchor="end" height={100} />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                          <Bar dataKey="quantity" fill="#82ca9d" name="Quantity" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Item Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={itemAnalytics}
                            dataKey="revenue"
                            nameKey="itemName"
                            cx="50%"
                            cy="50%"
                            outerRadius={150}
                            label
                          >
                            {itemAnalytics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="tables">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card>
                  <CardHeader>
                    <CardTitle>Table Performance</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={tableAnalytics}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="tableId" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="totalOrders" fill="#8884d8" name="Orders" />
                          <Bar dataKey="totalRevenue" fill="#82ca9d" name="Revenue" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Table Revenue Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[400px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={tableAnalytics}
                            dataKey="totalRevenue"
                            nameKey="tableId"
                            cx="50%"
                            cy="50%"
                            outerRadius={150}
                            label
                          >
                            {tableAnalytics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
};

export default Analytics; 