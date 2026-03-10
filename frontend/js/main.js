function openFeatures() {
    const home = document.getElementById("home");
    const features = document.getElementById("featuresPage");

    if (!home || !features) {
        console.error("Section IDs not found");
        return;
    }

    home.style.display = "none";
    features.style.display = "block";
}

function closeFeatures() {
    const home = document.getElementById("home");
    const features = document.getElementById("featuresPage");

    features.style.display = "none";
    home.style.display = "flex";
}
