import { CircleDollarSignIcon, CreditCardIcon, ChartPieIcon, DollarSignIcon, WalletIcon } from 'lucide-react'

import { Card } from '@/components-V2/platform-components/ui/card'
import StatisticsOrderCard from '@/components-V2/platform-views/dashboards/statistics/statistics-order-card'
import StatisticsProfitCard from '@/components-V2/platform-views/dashboards/statistics/statistics-profit-card'
import StatisticsUserReachCard from '@/components-V2/platform-views/dashboards/statistics/statistics-user-reach-card'
import StatisticsTotalProfitCard from '@/components-V2/platform-views/dashboards/statistics/statistics-total-profit-card'
import StatisticsCard from '@/components-V2/platform-views/dashboards/statistics/statistics-card-05'
import TotalTransactionCard from '@/components-V2/platform-views/dashboards/charts/chart-total-transaction'
import TotalSalesCard from '@/components-V2/platform-views/dashboards/charts/chart-total-sales'
import AdvertisementCard from '@/components-V2/platform-views/dashboards/widgets/widget-advertisement'
import EarningReportCard from '@/components-V2/platform-views/dashboards/charts/chart-earning-report'
import InvoiceDatatable, { type Item } from '@/components-V2/platform-views/datatables/datatable-invoice'

const StatisticsCardData = [
  {
    icon: <CircleDollarSignIcon />,
    title: 'Total Income',
    badgeContent: 'Last week',
    value: '$4,673',
    changePercentage: 25.2,
    iconClassName: 'bg-chart-2/10 text-chart-2',
  },
  {
    icon: <CreditCardIcon />,
    title: 'Total Expense',
    badgeContent: 'Last month',
    value: '$1.28K',
    changePercentage: -12.2,
    iconClassName: 'bg-chart-1/10 text-chart-1',
  },
]

const statData = [
  {
    icon: <ChartPieIcon />,
    title: 'Net profit',
    department: 'Sales',
    value: '$1,623',
    trend: 'up' as const,
    percentage: 20.3,
    iconClassName: 'bg-chart-1/10 text-chart-1',
  },
  {
    icon: <DollarSignIcon />,
    title: 'Total income',
    department: 'Sales, Affiliation',
    value: '$5,600',
    trend: 'up' as const,
    percentage: 16.2,
    iconClassName: 'bg-chart-2/10 text-chart-2',
  },
  {
    icon: <WalletIcon />,
    title: 'Total expense',
    department: 'ADVT, Marketing',
    value: '$3,200',
    trend: 'up' as const,
    percentage: 10.5,
    iconClassName: 'bg-chart-5/10 text-chart-5',
  },
]

const earningReportChartData = [
  { day: 'Monday', earning: 48, fill: 'color-mix(in oklab, var(--chart-2) 20%, transparent)' },
  { day: 'Tuesday', earning: 147, fill: 'color-mix(in oklab, var(--chart-2) 20%, transparent)' },
  { day: 'Wednesday', earning: 106, fill: 'color-mix(in oklab, var(--chart-2) 20%, transparent)' },
  { day: 'Thursday', earning: 180, fill: 'var(--chart-2)' },
  { day: 'Friday', earning: 75, fill: 'color-mix(in oklab, var(--chart-2) 20%, transparent)' },
  { day: 'Saturday', earning: 60, fill: 'color-mix(in oklab, var(--chart-2) 20%, transparent)' },
  { day: 'Sunday', earning: 128, fill: 'color-mix(in oklab, var(--chart-2) 20%, transparent)' },
]

const invoiceData: Item[] = [
  {
    id: '5099',
    status: 'draft',
    avatar: '/images/avatars/avatar-1.webp',
    fallback: 'JA',
    client: 'Jack Alfredo',
    field: 'UI/UX designer',
    total: 3120,
    issuedDate: new Date('2025-04-03'),
    balance: 0,
  },
  {
    id: '5008',
    status: 'paid',
    avatar: '/images/avatars/avatar-2.webp',
    fallback: 'MG',
    client: 'Maria Gonzalez',
    field: 'Frontend developer',
    total: 1450,
    issuedDate: new Date('2025-05-12'),
    balance: 0,
  },
  {
    id: '5101',
    status: 'paid',
    avatar: '/images/avatars/avatar-3.webp',
    fallback: 'JD',
    client: 'John Doe',
    field: 'Graphic designer',
    total: 1200,
    issuedDate: new Date('2025-06-26'),
    balance: 0,
  },
  {
    id: '4586',
    status: 'downloaded',
    avatar: '/images/avatars/avatar-4.webp',
    fallback: 'EC',
    client: 'Emily Carter',
    field: 'UI/UX designer',
    total: 2680,
    issuedDate: new Date('2025-07-05'),
    balance: -78,
  },
  {
    id: '4360',
    status: 'draft',
    avatar: '/images/avatars/avatar-5.webp',
    fallback: 'DL',
    client: 'David Lee',
    field: 'Backend developer',
    total: 3120,
    issuedDate: new Date('2025-08-07'),
    balance: 0,
  },
  {
    id: '5104',
    status: 'past due',
    avatar: '/images/avatars/avatar-6.webp',
    fallback: 'SP',
    client: 'Sophia Patel',
    field: 'Product manager',
    total: 1600,
    issuedDate: new Date('2025-08-26'),
    balance: 86,
  },
  {
    id: '5201',
    status: 'paid',
    avatar: '/images/avatars/avatar-7.webp',
    fallback: 'MW',
    client: 'Michael Williams',
    field: 'Full Stack Developer',
    total: 2850,
    issuedDate: new Date('2025-01-15'),
    balance: 0,
  },
  {
    id: '4987',
    status: 'draft',
    avatar: '/images/avatars/avatar-8.webp',
    fallback: 'AB',
    client: 'Amanda Brown',
    field: 'Marketing Specialist',
    total: 1750,
    issuedDate: new Date('2025-02-20'),
    balance: 0,
  },
]

const SalesDashboard = () => {
  return (
    <div className='grid grid-cols-6 gap-6'>
      <StatisticsTotalProfitCard className='max-xl:col-span-2 max-md:col-span-3' />
      <StatisticsOrderCard className='max-xl:col-span-2 max-md:col-span-3' />
      <StatisticsProfitCard className='max-xl:col-span-2 max-md:col-span-3' />
      <StatisticsUserReachCard className='max-xl:col-span-2 max-md:col-span-3' />

      {StatisticsCardData.map((card, index) => (
        <StatisticsCard
          key={index}
          icon={card.icon}
          title={card.title}
          time={card.badgeContent}
          value={card.value}
          changePercentage={card.changePercentage}
          className='max-xl:col-span-2 max-md:col-span-3'
          iconClassName={card.iconClassName}
        />
      ))}

      <TotalTransactionCard className='col-span-full lg:col-span-4' />

      <TotalSalesCard className='col-span-full sm:col-span-3 lg:col-span-2' />

      <EarningReportCard
        title='Earning Report'
        subTitle='Weekly Earning overview'
        statData={statData}
        chartData={earningReportChartData}
        className='col-span-full sm:col-span-3 lg:col-span-2'
      />

      <AdvertisementCard className='col-span-full sm:col-span-3 lg:col-span-2' />

      <Card className='col-span-full py-0'>
        <InvoiceDatatable data={invoiceData} />
      </Card>
    </div>
  )
}

export default SalesDashboard
