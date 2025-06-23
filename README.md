# Gantt Chart Outage Dashboard

A comprehensive outage management system with Gantt chart visualization, enhanced forms, email notifications, and metrics dashboard.

## 🚀 Local Setup Instructions

### Prerequisites

Make sure you have these installed on your system:
- **Node.js** (version 18.17.0 or higher) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** (optional, for version control)

### Installation

1. **Download the Project**
   - Use the **"Download Code"** button from the v0 interface
   - Or clone from your repository if available

2. **Navigate to Project Directory**
   \`\`\`bash
   cd your-project-folder
   \`\`\`

3. **Install Dependencies**
   \`\`\`bash
   npm install
   # or if you prefer yarn
   yarn install
   \`\`\`

### Environment Configuration

Create a \`.env.local\` file in your project root:

\`\`\`env
# Email Configuration (Optional - for notifications)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
FROM_EMAIL=your-email@gmail.com

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
\`\`\`

### Running the Application

#### Development Mode
\`\`\`bash
npm run dev
# or with yarn
yarn dev
\`\`\`

The application will be available at: **http://localhost:3000**

#### Production Build
\`\`\`bash
# Build the application
npm run build

# Start the production server
npm start
\`\`\`

## 📁 Project Structure

\`\`\`
outage-dashboard/
├── app/
│   ├── layout.tsx              # Root layout component
│   ├── page.tsx                # Main dashboard page
│   ├── globals.css             # Global styles
│   └── api/                    # API routes
│       ├── outages/
│       ├── notify/
│       └── config/
├── components/
│   ├── ui/                     # Reusable UI components
│   ├── enhanced-outage-form.tsx
│   ├── tabular-multi-outage-form.tsx
│   ├── enhanced-gantt-chart.tsx
│   ├── enhanced-metrics-dashboard.tsx
│   └── ...
├── lib/
│   ├── utils.ts                # Utility functions
│   ├── email-config.ts         # Email configuration
│   ├── timezone-utils.ts       # Timezone handling
│   └── parse-excel.ts          # Excel parsing utilities
├── actions/
│   ├── outage-actions.ts       # Outage CRUD operations
│   ├── email-actions.ts        # Email notification logic
│   └── data-actions.ts         # Data processing
├── data/
│   ├── outages.json           # Sample outage data
│   ├── environments.json      # Environment configurations
│   └── teams.json             # Team information
├── public/                    # Static assets
├── .env.local                 # Environment variables
├── package.json               # Dependencies and scripts
├── next.config.ts             # Next.js configuration
└── tailwind.config.ts         # Tailwind CSS configuration
\`\`\`

## 🎯 Features

### Core Functionality
- ✅ **Interactive Gantt Chart** - Visual timeline of outages
- ✅ **Single Outage Form** - Create individual outages with enhanced UI
- ✅ **Multi-Outage Form** - Bulk outage creation with tabular interface
- ✅ **Enhanced Metrics Dashboard** - Comprehensive analytics and insights
- ✅ **Email Notifications** - Automated notifications with Excel attachments
- ✅ **Timezone Support** - Global timezone handling
- ✅ **Excel Export** - Data export functionality

### Enhanced UI Components
- 🎨 **Professional Form Design** - Gradient backgrounds and improved layouts
- 🎨 **Enhanced Dropdowns** - Rich selectors with visual indicators
- 🎨 **Interactive Elements** - Hover effects and visual feedback
- 🎨 **Responsive Design** - Mobile-friendly interface
- 🎨 **Color-coded Environments** - Visual environment identification

### Data Management
- 📊 **Comprehensive Metrics** - Uptime, downtime, and trend analysis
- 📊 **Team Workload Distribution** - Resource allocation insights
- 📊 **Environment Impact Analysis** - Service-specific reporting
- 📊 **Automated Insights** - AI-powered recommendations

## 🔧 Development

### Available Scripts

\`\`\`bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Type checking
npm run type-check
\`\`\`

### Troubleshooting

#### Port 3000 Already in Use
\`\`\`bash
# Use a different port
npm run dev -- -p 3001
\`\`\`

#### Module Not Found Errors
\`\`\`bash
# Clear dependencies and reinstall
rm -rf node_modules package-lock.json
npm install
\`\`\`

#### TypeScript Errors
\`\`\`bash
# Run type checking
npm run type-check
\`\`\`

## 📧 Email Configuration

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
3. Use the App Password in \`SMTP_PASS\` environment variable

### Other Email Providers
Update SMTP settings in \`.env.local\` according to your provider:

\`\`\`env
# Example for Outlook
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your-email@outlook.com
SMTP_PASS=your-password
\`\`\`

## 🌐 API Endpoints

- \`GET /api/outages\` - Retrieve outages
- \`POST /api/outages\` - Create new outage
- \`POST /api/notify\` - Send notifications
- \`GET /api/config\` - Get configuration

## 🎨 Customization

### Themes and Styling
- Modify \`tailwind.config.ts\` for custom colors
- Update \`app/globals.css\` for global styles
- Customize component styles in individual files

### Environment Configuration
- Update \`data/environments.json\` for your environments
- Modify \`data/teams.json\` for your team structure
- Customize email templates in \`actions/email-actions.ts\`

## 📱 Browser Support

- ✅ Chrome (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)

## 🔒 Security

- Environment variables for sensitive data
- Input validation and sanitization
- CSRF protection
- Secure email handling

## 📈 Performance

- Server-side rendering with Next.js
- Optimized bundle size
- Lazy loading of components
- Efficient data processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
1. Check the troubleshooting section above
2. Review the project documentation
3. Open an issue in the repository
4. Contact the development team

---

**Built with ❤️ using Next.js, TypeScript, and Tailwind CSS**
