const API_BASE_URL = "http://localhost:3000/trip";
const responseDiv = document.getElementById("response");

// Helper function to display response
function displayResponse(data) {
  responseDiv.textContent = JSON.stringify(data, null, 2);
}

// Get All Trips
document.getElementById("getAllTrips").addEventListener("click", async () => {
  try {
    const response = await fetch(API_BASE_URL, {
      headers: {
        Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6IkFqLk0iLCJpYXQiOjE3NTk0MTg5MzMsImV4cCI6MTc2MjAxMDkzMywiaXNzIjoiQ1MtTVNVIn0.N1VXE5c7XuD6sotHkW_SyD4Z15I5lzbFsJe9z4vw394`,
      },
    });
    const data = await response.json();
    displayResponse(data);
  } catch (error) {
    displayResponse({ error: error.message });
  }
});
