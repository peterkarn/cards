class Card {
  constructor(id) {
    this.id = id;
    this.revealed = false;
    this.element = document.createElement('button');
    this.element.classList.add('card');
    this.element.dataset.id = id;
    this.element.innerHTML = this.renderTemplate(id);
  }

  renderTemplate(content) {
    return `
       <div class="card__inner">
        <div class='card__front'></div>
        <div class='card__rear'>${content}</div>
       </div>
    `
  }

  reveal() {
    if(!this.revealed) {
      this.element.classList.add('revealed');
      this.revealed = true;
    }
  }
  hide() {
    this.element.classList.remove('revealed');
    this.revealed = false;
  }
}
class Timer {
  #paused = true;
  #exceeded = false;
  #seconds = 0;
  #initialValue = 0;

  get exceeded() {
    return this.#exceeded;
  }

  constructor(selector, seconds, callback) {
    if (seconds < 0 || typeof seconds !== 'number') {
      throw new Error('Invalid timer value');
      return
    }
    this.#seconds = seconds;
    this.#initialValue = seconds;
    this.selector = selector;
    this.onTimerEnds = callback;
    this.selector.innerHTML = this.renderTemplate();
    this.renderTime();
  }
  renderTemplate() {
    return `
      <div class="timer">
        <span class="timer__minutes"></span>:<span class="timer__seconds"></span>
      </div>
    `
  }
  renderTime() {
    const minutesAmount = Math.floor(this.#seconds / 60);
    const secondsAmount =  this.#seconds % 60;

    this.selector.querySelector('.timer__minutes').textContent = minutesAmount.toString().padStart(2, '0');
    this.selector.querySelector('.timer__seconds').textContent = secondsAmount.toString().padStart(2, '0');
  }
  start() {
    if (this.#seconds === 0 || !this.#paused) return;
    this.#exceeded = false;
    this.interval = setInterval(() => {
      this.#seconds--;
      this.renderTime();
      if(this.#seconds === 0) {
        this.stop();
        this.#exceeded = true;
        this.onTimerEnds();
      }
    }, 1000);
    this.#paused = false;
  }
  stop() {
    this.#paused = true;
    clearInterval(this.interval);
  }
  restart() {
    this.stop();
    this.#seconds = this.#initialValue;
    this.renderTime();
    this.start();
  }
}
class MatchGrid {
  animationDuration = 500;
  states = {
    pending: 'pending',
    active: 'active',
    ended: 'ended',
    paused: 'paused'
  }
  constructor(config) {
    const {
      selector,
      width,
      height,
      numberOfRows,
      numberOfColumns,
      theme,
      timeLimit
    } = config;

    this.selector = document.querySelector(selector);
    this.width = width;
    this.height = height;
    this.theme = theme;
    this.timeLimit = timeLimit;
    this.gameState = this.states.pending;
    this.idsList = [];
    this.cards = [];
    this.revealed = [];
    this.pairToCompare = [];
    this.numberOfRows = numberOfRows % 2 === 0 ? numberOfRows : numberOfRows + 1;
    this.numberOfColumns = numberOfColumns % 2 === 0 ? numberOfColumns : numberOfColumns + 1;
    this.totalCardsNumber = this.numberOfColumns * this.numberOfRows;

    this.init();
    this.generateIds();
    this.renderGrid();
    this.renderControls();
  }

  init() {
    const div = document.createElement('div');
    div.classList.add('grid');
    this.selector.append(div);
    this.gridContainer = div;
    this.theme === 'dark' ? this.selector.classList.add('dark') : '';
    this.gridContainer.classList.add(this.states.pending);
    this.gridContainer.style.setProperty('--width', `${this.width}px`);
    this.gridContainer.style.setProperty('--height', `${this.height}px`);
    this.gridContainer.style.setProperty('--columns', this.numberOfColumns);
    this.gridContainer.style.setProperty('--rows', this.numberOfRows);
    this.gridContainer.addEventListener('mouseenter', this.resumeGame.bind(this));
    this.gridContainer.addEventListener('mouseleave', this.pauseGame.bind(this));
    this.gridContainer.addEventListener('click', (e) => this.handleClick(e));

    const timerContainer = document.createElement('div');
    this.timer = new Timer(timerContainer, this.timeLimit, this.checkGameStatus.bind(this));
    this.selector.append(timerContainer);
  }
  renderGrid() {
    if(this.gridContainer.innerHTML) {
      this.gridContainer.innerHTML = '';
    }
    for(let i = 0; i < this.idsList.length; i++) {
      const card = new Card(this.idsList[i]);
      this.gridContainer.append(card.element);
      this.cards.push(card);
      this.animateCards();
    }
  }
  generateIds() {
    const pairs = new Set();
    const totalPairsNumber = this.totalCardsNumber / 2;

    while(pairs.size < totalPairsNumber) {
      const randomId = Math.floor(Math.random() *  totalPairsNumber);
      pairs.add(randomId);
    }
    const shuffleArray = (arr) => arr.sort(() => Math.random() - .5);
    this.idsList =  [...shuffleArray(Array.from(pairs)), ...shuffleArray(Array.from(pairs))];
  }
  animateCards() {
    anime({
      targets: this.cards.map(card => card.element),
      opacity: [
        {value: 1, easing: 'easeInOutQuad', duration: this.animationDuration / 2}
      ],
      delay: anime.stagger(100, {
        grid: [this.numberOfRows, this.numberOfColumns], from: 'center'
      })
    });
  }
  handleClick(e) {
    const cardEl = e.target.closest('.card');
    if(!cardEl) return
    const cardElId = +cardEl.dataset.id;
    let cardObj = this.cards.find(card => card.id === cardElId && card.element === cardEl);

    if (cardObj.revealed || this.gameState !== this.states.active) return

    cardObj.reveal();
    this.pairToCompare.push(cardObj);

    if(this.pairToCompare.length < 2) return;

    const [card1, card2] = this.pairToCompare;
    if(card1.id === card2.id) {
      this.revealed = [...this.revealed, ...this.pairToCompare];
      this.checkGameStatus();
      this.pairToCompare = [];
    } else {
      this.gameState = this.states.pending;
      setTimeout(() => {
        card1.hide();
        card2.hide();
        this.pairToCompare = [];
        this.gameState = this.states.active;
      }, this.animationDuration * 2);
    }

  }
  renderControls() {
    const startButton = new ActionButton(
        {text: 'Start', classnames: ['btn'], callback: this.startGame.bind(this)}
    );
    const restartButton = new ActionButton(
        {text: 'Restart', classnames: ['btn', 'd-none'], callback: this.restartGame.bind(this)}
    );
    this.selector.append(startButton.element, restartButton.element);
  }
  startGame() {
    this.gameState = this.states.active;
    this.gridContainer.classList.remove(this.states.pending);
    this.gridContainer.classList.add(this.states.active);
    this.timer.start();
    this.toggleBtns();
  }
  pauseGame() {
    this.gameState = this.states.paused;
    this.gridContainer.classList.replace(this.states.active, this.states.paused);
    this.timer.stop();
  }
  resumeGame() {
    if(this.gameState === this.states.active || this.gameState === this.states.ended ) return
    this.gameState = this.states.active;
    this.gridContainer.classList.replace(this.states.paused, this.states.active);
    this.timer.start();
  }
  endGame() {
    this.gameState = this.states.ended;
    this.gridContainer.classList.replace(this.states.active, this.states.ended);
    this.timer.stop();
  }
  restartGame() {
    for (let card of this.cards) {
      card.revealed = false;
    }
    this.revealed = [];
    this.cards = [];
    this.generateIds();
    this.gridContainer.classList.forEach(cls => {
      if (cls !== 'grid') this.gridContainer.classList.remove(cls);
    })
    this.gridContainer.classList.add(this.states.active);
    setTimeout(() => {
      this.timer.restart();
    }, this.animationDuration * 2);
    this.renderGrid();
  }
  toggleBtns() {
    const btns = this.selector.querySelectorAll('.btn');
    btns.forEach(btn => btn.classList.toggle('d-none'));
  }
  checkGameStatus() {
    const total = this.cards.length;
    const revealed = this.revealed.length;
    if(total === revealed && !this.timer.exceeded) {
      setTimeout(() =>{
        alert('You win');
        this.endGame();
      }, this.animationDuration);
    }

    if(this.timer.exceeded && this.cards.length !== this.revealed.length) {
      setTimeout(() =>{
        alert('You Lose :( Try again');
        this.endGame();
      }, this.animationDuration);
    }
  }
}
class ActionButton {
  constructor(config) {
    this.element = document.createElement('button');
    this.element.classList.add(...config.classnames);
    this.element.textContent = config.text;
    this.element.addEventListener('click', config.callback)
  }
}

new MatchGrid({
  selector: '#grid1',
  width: 800,
  height: 800,
  numberOfRows: 4,
  numberOfColumns: 4,
  timeLimit: 20,
});
new MatchGrid({
  selector: '#grid2',
  width: 500,
  height: 500,
  numberOfRows: 8,
  numberOfColumns: 2,
  timeLimit: 2,
  theme: 'dark'
});