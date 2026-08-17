const KST_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Seoul',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

export function formatKstTime(date: Date) {
  return KST_TIME_FORMAT.format(date)
}
