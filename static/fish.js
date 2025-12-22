document.addEventListener('DOMContentLoaded', () => {
    // Target the new wrapper class
    const fish = document.querySelector('.fish-wrapper');

    if (!fish) return;

    let direction = 'right'; // start swimming to right
    let isFirstSwim = true; // Track if this is the first swim

    function startSwim() {
        // On first swim, start fish at random position on screen for instant visibility
        if (isFirstSwim) {
            const randomStartPos = Math.floor(Math.random() * 50) + 10; // 10-60% from left
            fish.style.left = randomStartPos + '%';
            isFirstSwim = false;
        }
        // Randomize vertical position (10% to 80% of screen height)
        const randomTop = Math.floor(Math.random() * 70) + 10;
        fish.style.top = randomTop + '%';

        // Randomize speed (20s to 40s)
        const randomDuration = Math.floor(Math.random() * 20) + 20;
        fish.style.animationDuration = randomDuration + 's';

        // Randomize size slightly (130px to 210px)
        const randomWidth = Math.floor(130 + (Math.random() * 80));
        fish.style.width = randomWidth + 'px';

        // Set direction class
        fish.classList.remove('swim-right', 'swim-left');

        // Force reflow to allow restarting animation if class was already there (though we toggle)
        void fish.offsetWidth;

        if (direction === 'right') {
            fish.classList.add('swim-right');
        } else {
            fish.classList.add('swim-left');
        }
    }

    fish.addEventListener('animationend', () => {
        // Toggle direction for next run
        direction = direction === 'right' ? 'left' : 'right';

        // Start next swim immediately without delay
        startSwim();
    });

    // Initial start
    startSwim();

    // Get tooltip element
    const tooltip = fish.querySelector('.fish-tooltip');

    // Fix hover pause functionality using CSS class
    fish.addEventListener('mouseenter', () => {
        fish.classList.add('paused');

        // Auto-adjust tooltip position based on fish location
        const rect = fish.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        // If fish is in top 30% of screen, show tooltip below
        if (rect.top < windowHeight * 0.3) {
            tooltip.classList.add('below');
        } else {
            tooltip.classList.remove('below');
        }
    });

    fish.addEventListener('mouseleave', () => {
        fish.classList.remove('paused');
    });
});
