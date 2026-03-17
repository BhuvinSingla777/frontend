import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  const handleClick = () => {
    console.log("Button clicked");

    fetch("http://localhost:3000/api/hello")
      .then((res) => {
        console.log("Request sent ✅");   // 👈 shows request trigger
        return res.json();
      })
      .then((data) => {
        console.log("Response:", data);  // 👈 see response
        setMessage(data.message);
      })
      .catch((err) => console.error("Error:", err));
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Front-end Connected </h1>
      <p>{message}</p>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
}

export default App;