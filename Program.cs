using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Hosting;

var builder = WebApplication.CreateBuilder(args);

// Serve static files from wwwroot
builder.Services.AddDirectoryBrowser();

var app = builder.Build();

// Disable HTTPS redirection for dev (keep commented if you want HTTPS)
 // app.UseHttpsRedirection();

app.UseDefaultFiles(); // serve index.html by default
app.UseStaticFiles();

// Simple JSON API (optional) — returns contact info
app.MapGet("/api/contact", () => Results.Json(new {
    name = "Faiz Shaikh",
    summary = "Full-Stack Software Engineer | Cloud-native APIs, .NET, TypeScript, React. Passionate about building scalable, production systems.",
    email = "faiz.corsair@gmail.com",
    linkedin = "http://www.linkedin.com/in/prepreater",
    github = "https://github.com/plasmacat420",
    leetcode = "https://leetcode.com/u/faiz0308/"
}));

app.MapGet("/", () => Results.Redirect("/index.html"));

app.Run();
