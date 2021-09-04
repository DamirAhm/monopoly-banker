# Monopoly bank helper

This is an app that will help you to manage money when you are playing monopoly.
I made this app as a fun project after one of my friends scattered all of the monopoly money and i had to collect all of them. I know this isn't common behavior for friends but anyway collecting and sorting all of the money is always the most annoying part of the monopoly. Also this app can help banker to track players' moves because even irl some of the players can steal some money from the bank when banker is thinking about his supremacy. And this problems i tried to fix with this app. Wether i succeed or not, you decide.

## Description

The main task of this app is distributing banker opportunities between all players. You can adjust all game parameters (such as initial amount of money, money for circle passed and even time limit of the game) to make your experience as comfortable as possible.

## Start

```shell
$ git clone https://github.com/DamirAhm/monopoly-banker.git
$ cd monopoly-banker
$ npm run start
```

## Usage

### Initial page

On this page you only can create a new game. Yeah :|

### Game settings page

On this page you will need to add players to the game, pick which player will be a banker, and optionally change sequence of players. Also set other optional game settings such as initial money amount, money for circle passed and customize time limit.
At any time you can reset settings to it's defaults.
And when you are done you can push complete button to create the room.

### Player pick page

On this page you'll find your name after click on it, you'll be replaced to player/banker page. Player name with green border is a banker.
Also you'll find button to copy game link to share it to your friends.

### Player page

If you are a common player you will be replaced on this page, there, you'll see buttons to send money to other players or to bank and buttons to give turn and to say that you've passed a circle.

### Banker page

If you're banker you'll be replaced on this page, there you'll find 3 tabs.

#### Player's tab

On this tab you'll see page that common players see

#### Money tab

On this tab banker can see and change players money amount

#### Moves log tab

On this tab banker can see players moves (such as giving money and passing circle) and cancel them.
