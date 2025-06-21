import type React from "react"
const OutageDashboard = () => {
  const outages = [
    {
      id: "1",
      title: "Planned Outage",
      startDate: new Date("2024-04-01T00:00:00.000Z"),
      endDate: new Date("2024-04-01T02:00:00.000Z"),
      status: "Scheduled",
    },
    {
      id: "2",
      title: "Unplanned Outage",
      startDate: new Date("2024-03-15T00:00:00.000Z"),
      endDate: new Date("2024-03-15T01:00:00.000Z"),
      status: "Active",
    },
    {
      id: "3",
      title: "Resolved Outage",
      startDate: new Date("2024-03-10T00:00:00.000Z"),
      endDate: new Date("2024-03-10T00:30:00.000Z"),
      status: "Resolved",
    },
    {
      id: "4",
      title: "Future Planned Outage",
      startDate: new Date("2024-05-01T00:00:00.000Z"),
      endDate: new Date("2024-05-01T02:00:00.000Z"),
      status: "Scheduled",
    },
  ]

  const Card = ({ children }: { children: React.ReactNode }) => {
    return <div className="border rounded-md bg-white shadow-sm">{children}</div>
  }

  const CardContent = ({ children }: { children: React.ReactNode }) => {
    return <div className="p-4">{children}</div>
  }

  const Calendar = () => {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="lucide lucide-calendar"
      >
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <line x1="16" x2="16" y1="2" y2="6" />
        <line x1="8" x2="8" y1="2" y2="6" />
        <line x1="3" x2="21" y1="10" y2="10" />
      </svg>
    )
  }

  return (
    <div className="w-full space-y-6">
      <h1>Outage Dashboard</h1>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-red-600">
                    {outages.filter((o) => o.status === "Active").length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">
                    {outages.filter((o) => o.status === "Resolved").length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {
                      outages.filter((o) => {
                        const now = new Date()
                        return o.startDate > now
                      }).length
                    }
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Upcoming Planned</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {
                      outages.filter((o) => {
                        const now = new Date()
                        return o.startDate > now && o.status === "Scheduled"
                      }).length
                    }
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">This Month</p>
                  <p className="text-2xl font-bold">
                    {
                      outages.filter((o) => {
                        const now = new Date()
                        return o.startDate.getMonth() === now.getMonth()
                      }).length
                    }
                  </p>
                </div>
                <Calendar className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">All Time</p>
                  <p className="text-2xl font-bold">{outages.length}</p>
                </div>
                <Calendar className="w-8 h-8" />
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
      {/* Add your dashboard content here */}
    </div>
  )
}

export default OutageDashboard
