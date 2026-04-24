function showInfo(type) {
  const title = document.getElementById("popup-title");
  const text = document.getElementById("popup-text");
  const popup = document.getElementById("popup");

  switch(type) {

    case "gas":
      title.innerHTML = "⚠️ Gas Leak Detection";
      text.innerHTML = "Hydrogen is highly flammable and difficult to detect. Sensors placed near the ceiling identify leaks early to prevent explosions.";
      break;

    case "ventilation":
      title.innerHTML = "💨 Ventilation System";
      text.innerHTML = "Proper ventilation removes hydrogen buildup, reducing fire and explosion risks in the laboratory.";
      break;

    case "cylinder":
      title.innerHTML = "🧯 Gas Cylinder Storage";
      text.innerHTML = "Cylinders must be secured upright and stored in ventilated areas away from heat and ignition sources.";
      break;

    case "chemical":
      title.innerHTML = "🧪 Chemical Storage";
      text.innerHTML = "Flammable chemicals should be stored in approved safety cabinets to prevent accidental ignition.";
      break;

    case "equipment":
      title.innerHTML = "🔧 Equipment & Leak Points";
      text.innerHTML = "Valves, joints, and fittings must be inspected regularly to prevent hydrogen leaks.";
      break;
  }

  popup.classList.remove("hidden");
}

function closePopup() {
  document.getElementById("popup").classList.add("hidden");
}

window.onclick = function(event) {
  const popup = document.getElementById("popup");
  if (event.target === popup) {
    popup.classList.add("hidden");
  }
}