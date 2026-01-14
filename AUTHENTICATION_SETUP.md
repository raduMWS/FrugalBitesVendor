# FrugalBites Authentication System

## Overview
Complete email/password authentication system with JWT tokens and password hashing using BCrypt. Includes VIP status selection for premium subscribers.

## Backend Implementation

### AuthController.cs
Location: `FrugalBites/Controllers/AuthController.cs`

**Endpoints:**
- `POST /api/auth/signup` - Register new user with email/password
- `POST /api/auth/login` - Login with email/password  
- `POST /api/auth/logout` - Logout (token invalidation)

**Features:**
- BCrypt password hashing (4.0.3)
- JWT token generation (7 day expiry)
- User email uniqueness validation
- Password verification on login
- Automatic user ID generation with Guid

### JWT Configuration
Location: `FrugalBites/appsettings.json`

```json
"JwtSettings": {
  "Secret": "your-super-secret-key-change-this-in-production-with-at-least-32-characters-long",
  "Issuer": "FrugalBites",
  "Audience": "FrugalBitesApp"
}
```

**Important:** Update the secret key in production with a strong 32+ character value.

### Program.cs Setup
Location: `FrugalBites/Program.cs`

Configured:
- JWT authentication scheme with `JwtBearerDefaults`
- Token validation parameters (issuer, audience, lifetime)
- Middleware chain: Authentication → Authorization
- Symmetric signing key with HS256 algorithm

### User Model
Location: `FrugalBites/Models/Entities/User.cs`

Fields:
- `UserId` (Guid) - Primary key
- `Email` (string) - Unique identifier
- `PasswordHash` (string) - BCrypt hashed password
- `FirstName` / `LastName` (string)
- `UserType` (enum) - CONSUMER or MERCHANT
- `IsEmailVerified` / `IsPhoneVerified` (bool)
- `IsActive` (bool)
- `CreatedAt` / `UpdatedAt` / `LastLoginAt` (DateTime)

## Mobile App Implementation

### Authentication Types
Location: `FrugalBitesMobileExpo/src/types/auth.ts`

```typescript
interface AuthUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: UserType;
  subscriptionStatus: SubscriptionStatus;
  isEmailVerified: boolean;
  createdAt: Date;
}

enum SubscriptionStatus {
  FREE = 'FREE',
  VIP = 'VIP'
}
```

### AuthContext
Location: `FrugalBitesMobileExpo/src/context/AuthContext.tsx`

**Features:**
- Centralized authentication state management
- Secure token storage using `expo-secure-store`
- Auto-restore user session on app launch
- Loading/error state handling
- JWT token injection in API requests

**Hooks:**
```typescript
const { user, isSignedIn, isLoading, login, signup, logout } = useAuth();
```

### AuthScreen
Location: `FrugalBitesMobileExpo/src/screens/AuthScreen.tsx`

**Features:**
- Toggle between Login/SignUp modes
- Form validation:
  - Email format validation
  - Password minimum 6 characters
  - Password confirmation match (signup)
  - Required field validation
- VIP status selection (gold 👑 icon)
- Error message display
- Loading indicators during auth requests

**Form Fields:**

Login:
- Email
- Password

SignUp:
- Email
- First Name
- Last Name
- Password
- Confirm Password
- VIP Checkbox (optional)

### Navigation Flow
Location: `FrugalBitesMobileExpo/src/App.tsx`

```
App (AuthProvider wrapper)
├── RootNavigator (conditional based on isSignedIn)
│   ├── Auth Stack (not signed in)
│   │   └── AuthScreen
│   └── App Stack (signed in)
│       ├── HomeScreen
│       └── RestaurantDetailScreen
```

### API Service
Location: `FrugalBitesMobileExpo/src/services/api.ts`

**Auth Service Methods:**
```typescript
authService.login(credentials: LoginRequest): Promise<AuthResponse>
authService.signup(data: SignUpRequest): Promise<AuthResponse>
authService.logout(): Promise<void>
```

**Configuration:**
- Base URL: `http://localhost:5000/api` (development)
- Android emulator: `http://10.0.2.2:5000/api`
- Request timeout: 10 seconds
- Auto-injects Bearer token from secure storage

## Security Implementation

### Password Security
1. **Client:** Password sent over HTTPS only
2. **Server:** BCrypt hashing with default rounds (10)
3. **Storage:** Hash stored in database, never plain text
4. **Verification:** BCrypt.Verify() on login

### Token Security
1. **JWT:** 7-day expiration
2. **Storage:** Encrypted in iOS Keychain / Android Keystore via `expo-secure-store`
3. **Transmission:** Bearer token in Authorization header
4. **Validation:** Server validates signature and expiry

### Database
1. SQLite with EF Core
2. Connection: `Data Source=frugalbites.db`
3. Migrations: Auto-created on first run
4. User table indexed on Email for unique constraint

## Running the System

### Start Backend
```bash
cd FrugalBites
dotnet run --urls "http://localhost:5000"
```

The server will:
- Create database if needed
- Seed sample data (offers)
- Listen on `http://localhost:5000`
- Expose API on `/api/*`

### Start Mobile App
```bash
cd FrugalBitesMobileExpo
npm start
```

Then:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code for Expo Go app

## Testing Auth Flow

### 1. Signup Test
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123",
    "firstName": "John",
    "lastName": "Doe",
    "subscriptionStatus": "FREE"
  }'
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "userType": "CONSUMER",
    "subscriptionStatus": "FREE",
    "isEmailVerified": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

### 2. Login Test
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123"
  }'
```

### 3. Logout Test
```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Authorization: Bearer <token>"
```

## Next Steps & Enhancement Ideas

### Current (Done)
✅ Email/password authentication
✅ BCrypt password hashing
✅ JWT token generation
✅ Secure token storage (mobile)
✅ VIP status selection
✅ Form validation

### Future Enhancements
- [ ] Email verification flow
- [ ] Password reset functionality
- [ ] OAuth/Social login (Google, Facebook)
- [ ] Phone number verification
- [ ] 2FA/MFA support
- [ ] Rate limiting on auth endpoints
- [ ] Token refresh endpoint
- [ ] Subscription tier management
- [ ] Admin role and permissions
- [ ] User profile management

## Troubleshooting

### Issue: "Invalid email or password" on valid credentials
- Ensure BCrypt hashing worked correctly
- Check password comparison logic
- Verify user exists in database

### Issue: Token not sent in requests
- Check `expo-secure-store` is properly initialized
- Verify token stored in secure storage after login
- Check request interceptor in api.ts

### Issue: CORS errors
- Backend has `AllowAll` CORS policy enabled
- If custom domain, update CORS policy in Program.cs

### Issue: JWT validation fails
- Verify JWT secret matches in appsettings.json and Program.cs
- Check token expiration time
- Ensure issuer/audience match

## Files Summary

Backend:
- `Controllers/AuthController.cs` - Auth endpoints
- `Models/Entities/User.cs` - User model with password hash
- `appsettings.json` - JWT configuration
- `Program.cs` - JWT middleware setup

Mobile:
- `src/screens/AuthScreen.tsx` - Login/SignUp UI
- `src/context/AuthContext.tsx` - Auth state management
- `src/types/auth.ts` - TypeScript interfaces
- `src/services/api.ts` - API client with auth
- `src/App.tsx` - Navigation with auth routing
