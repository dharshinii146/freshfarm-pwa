const url = `http://127.0.0.1:${process.env.PORT || 5000}/api/health`;

for (let attempt = 0; attempt < 120; attempt += 1) {
  try {
    const response = await fetch(url);
    if (response.ok) process.exit(0);
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

console.error(`FreshFarm API did not become ready at ${url}`);
process.exit(1);
