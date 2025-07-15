export function playGenericGunShootSound() {
    const audio = new Audio("./audio/sounds/guns/genericgun_shoot.mp3");
    audio.play().catch(error => {
        console.error(`Error playing generic gun shoot sound: ${error} *hides*`);
    });
}