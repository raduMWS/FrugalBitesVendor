using FrugalBites.Data;
using FrugalBites.Models.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using BCrypt.Net;
using Serilog;

// Configure Serilog from appsettings.json
Log.Logger = new LoggerConfiguration()
    .ReadFrom.Configuration(new ConfigurationBuilder()
        .AddJsonFile("appsettings.json")
        .AddJsonFile($"appsettings.{Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production"}.json", optional: true)
        .Build())
    .CreateLogger();

try
{
    Log.Information("Starting FrugalBites API");

    var builder = WebApplication.CreateBuilder(args);

    // Use Serilog for logging
    builder.Host.UseSerilog();

    // Add services to the container.
    builder.Services.AddControllers();
    builder.Services.AddEndpointsApiExplorer();
    builder.Services.AddSwaggerGen();

// Add JWT Authentication
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secret = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT secret is not configured");
var key = Encoding.ASCII.GetBytes(secret);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidateAudience = true,
        ValidAudience = jwtSettings["Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero
    };
});

// Add database context
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

// Create database and tables
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.EnsureCreated();

    // Seed sample data if database is empty
    if (!dbContext.Offers.Any())
    {
        SeedSampleData(dbContext);
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

void SeedSampleData(ApplicationDbContext context)
{
    // Create sample users with properly hashed passwords
    var user1 = new FrugalBites.Models.Entities.User
    {
        Email = "john.doe@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("password123"),
        FirstName = "John",
        LastName = "Doe",
        UserType = FrugalBites.Models.Enums.UserType.CONSUMER,
        IsEmailVerified = true,
        IsPhoneVerified = false,
        IsActive = true,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    var user2 = new FrugalBites.Models.Entities.User
    {
        Email = "sarah.bakery@example.com",
        PasswordHash = BCrypt.Net.BCrypt.HashPassword("bakery123"),
        FirstName = "Sarah",
        LastName = "Johnson",
        UserType = FrugalBites.Models.Enums.UserType.MERCHANT,
        IsEmailVerified = true,
        IsPhoneVerified = false,
        IsActive = true,
        CreatedAt = DateTime.UtcNow,
        UpdatedAt = DateTime.UtcNow
    };

    context.Users.AddRange(user1, user2);
    context.SaveChanges();

    // Create sample merchant
    var merchant = new FrugalBites.Models.Entities.Merchant
    {
        UserId = user2.UserId,
        BusinessName = "Sarah's Bakery",
        BusinessType = FrugalBites.Models.Enums.BusinessType.BAKERY,
        AddressLine1 = "123 Main St",
        City = "San Francisco",
        PhoneNumber = "+1-555-0123",
        Description = "Fresh baked goods daily",
        Latitude = 37.7749m,
        Longitude = -122.4194m,
        IsVerified = true,
        CreatedAt = DateTime.UtcNow
    };

    context.Merchants.Add(merchant);
    context.SaveChanges();

    // Create sample offers
    var offers = new[]
    {
        new FrugalBites.Models.Entities.Offer
        {
            MerchantId = merchant.MerchantId,
            FoodName = "Fresh Croissants",
            Description = "Buttery croissants baked fresh this morning",
            OriginalPrice = 4.50m,
            DiscountedPrice = 2.25m,
            DiscountPercentage = 50,
            Quantity = 12,
            QuantityUnit = FrugalBites.Models.Enums.QuantityUnit.PIECE,
            Category = FrugalBites.Models.Enums.OfferCategory.BAKERY,
            Dietary = FrugalBites.Models.Enums.DietaryType.VEGETARIAN,
            ExpirationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(4)),
            PickupStartTime = DateTime.UtcNow.AddHours(1),
            PickupEndTime = DateTime.UtcNow.AddHours(6),
            IsAvailable = true,
            CreatedAt = DateTime.UtcNow
        },
        new FrugalBites.Models.Entities.Offer
        {
            MerchantId = merchant.MerchantId,
            FoodName = "Chocolate Chip Cookies",
            Description = "Homemade cookies with premium chocolate chips",
            OriginalPrice = 3.00m,
            DiscountedPrice = 1.50m,
            DiscountPercentage = 50,
            Quantity = 20,
            QuantityUnit = FrugalBites.Models.Enums.QuantityUnit.PIECE,
            Category = FrugalBites.Models.Enums.OfferCategory.BAKERY,
            Dietary = FrugalBites.Models.Enums.DietaryType.VEGETARIAN,
            ExpirationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(8)),
            PickupStartTime = DateTime.UtcNow.AddHours(2),
            PickupEndTime = DateTime.UtcNow.AddHours(10),
            IsAvailable = true,
            CreatedAt = DateTime.UtcNow
        },
        new FrugalBites.Models.Entities.Offer
        {
            MerchantId = merchant.MerchantId,
            FoodName = "Sourdough Bread Loaf",
            Description = "Artisan sourdough bread, perfect for sandwiches",
            OriginalPrice = 6.00m,
            DiscountedPrice = 3.00m,
            DiscountPercentage = 50,
            Quantity = 5,
            QuantityUnit = FrugalBites.Models.Enums.QuantityUnit.PACK,
            Category = FrugalBites.Models.Enums.OfferCategory.BAKERY,
            Dietary = FrugalBites.Models.Enums.DietaryType.VEGAN,
            ExpirationDate = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(12)),
            PickupStartTime = DateTime.UtcNow.AddHours(3),
            PickupEndTime = DateTime.UtcNow.AddHours(12),
            IsAvailable = true,
            CreatedAt = DateTime.UtcNow
        }
    };

    context.Offers.AddRange(offers);
    context.SaveChanges();
    
    Log.Information("Sample data seeded successfully");
}

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}
