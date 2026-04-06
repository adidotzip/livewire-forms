# LiveWire Form

This is a form made for a event. More details on [LiveWire](https://livewire.imreallyadi.space)

## ✨ New Features

- **Team-Based Registration**: Intelligent modal system for team management
- **Real-Time Auto-Save**: All form data persists in localStorage
- **Enhanced Student Details**: Includes class and section information
- **Smooth Animations**: Modern UI with Framer Motion transitions
- **Dynamic Validation**: Real-time form validation with visual feedback

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Update the environment variables in `.env.local`:
   - `NEXT_PUBLIC_SCRIPT_URL`: Your Google Apps Script URL for registration data
   - `NEXT_PUBLIC_MATERIALS_SCRIPT_URL`: Your Google Apps Script URL for materials data
   - `ADMIN_USERNAME` and `ADMIN_PASSWORD`: Admin credentials

5. Run the development server:
   ```bash
   npm run dev
   ```

## Google Apps Script Setup

You need two separate Google Apps Scripts:

### 1. Registration Script
- **File**: `google-apps-script.js`
- **Purpose**: Handles student registrations with in-game IDs, class, and section
- **Columns**: Timestamp, School Name, School Email, Student Name, Class, Section, Phone No., Event, In-Game ID

### 2. Materials Script
- **File**: `google-apps-script-materials.js`
- **Purpose**: Handles materials submissions
- **Columns**: Date, Drive, School, Event

### Setup Instructions:
1. Go to [script.google.com](https://script.google.com)
2. Create two new projects
3. Copy and paste the respective code from the files above
4. Deploy each as a Web App (Execute as: Me, Access: Anyone)
5. Copy the deployment URLs and update your `.env.local` file