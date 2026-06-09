import { PrismaClient } from '../generated/prisma';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import 'dotenv/config';

const pool    = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma  = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding...');

  // ─── DB leeren (Reihenfolge wegen Foreign Keys!) ──────────────────────────
  await prisma.teamPlayer.deleteMany();
  await prisma.player.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  console.log('🗑️  DB geleert');

  // ─── Teams ────────────────────────────────────────────────────────────────
  const teamData = [
    { name: 'Avengers',         abbreviation: 'AVE', color: '#e74c3c', organization: 'Marvel'      },
    { name: 'Fellowship',       abbreviation: 'FEL', color: '#8e44ad', organization: 'Middle Earth' },
    { name: 'Starfleet',        abbreviation: 'SFL', color: '#2980b9', organization: 'Star Trek'    },
    { name: 'Detectives',       abbreviation: 'DET', color: '#27ae60', organization: 'Mystery Inc'  },
    { name: 'Heisenberg',       abbreviation: 'HEI', color: '#f39c12', organization: 'ABQ'          },
    { name: 'Corleones',        abbreviation: 'COR', color: '#c0392b', organization: 'New York'     },
    { name: 'Adventurers',      abbreviation: 'ADV', color: '#d35400', organization: 'Indy Films'   },
    { name: 'Colonial Marines', abbreviation: 'MAR', color: '#7f8c8d', organization: 'Weyland'      },
    { name: 'MI6',              abbreviation: 'MI6', color: '#2c3e50', organization: 'British Gov'  },
    { name: 'Westeros',         abbreviation: 'WES', color: '#bdc3c7', organization: 'HBO'          },
    { name: 'Dunder Mifflin',   abbreviation: 'DUN', color: '#f1c40f', organization: 'Scranton'     },
    { name: 'Hill Valley',      abbreviation: 'HIL', color: '#1abc9c', organization: 'BTTF Films'   },
    { name: 'Zion',             abbreviation: 'ZIO', color: '#16a085', organization: 'The Matrix'   },
  ];

  const teamObjects = await Promise.all(
    teamData.map(data => prisma.team.create({ data }))
  );
  console.log(`✅ ${teamObjects.length} Teams erstellt`);

  // ─── Spieler (13 Teams × 22 Spieler = 286) ────────────────────────────────
  const players = await Promise.all([
    // Team 1 – Avengers
    prisma.player.create({ data: { name: 'Peter Parker',       number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Bruce Wayne',        number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Tony Stark',         number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Steve Rogers',       number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Thor Odinson',       number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Natasha Romanoff',   number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Clint Barton',       number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Sam Wilson',         number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Bucky Barnes',       number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Wanda Maximoff',     number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Han Solo',           number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Luke Skywalker',     number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Leia Organa',        number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Lando Calrissian',   number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Obi-Wan Kenobi',     number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Padmé Amidala',      number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Qui-Gon Jinn',       number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Mace Windu',         number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Ahsoka Tano',        number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Din Djarin',         number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Grogu',              number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Bo-Katan Kryze',     number: 24, position: 'Stürmer'     }}),

    // Team 2 – Fellowship
    prisma.player.create({ data: { name: 'Frodo Baggins',      number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Samwise Gamgee',     number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Gandalf Grau',       number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Aragorn Elessar',    number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Legolas Grünblatt',  number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Gimli Glóinson',     number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Boromir Gondor',     number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Faramir Gondor',     number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Éowyn Rohan',        number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Théoden König',      number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Meriadoc Brandybuck',number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Peregrin Took',      number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Arwen Undómiel',     number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Elrond Halbelb',     number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Galadriel Lórien',   number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Saruman Weiß',       number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Sauron Dunkel',      number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Treebeard Fangorn',  number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Glorfindel Rivendell',number: 21,position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Tom Bombadil',       number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Goldberry Fluss',    number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Shelob Spinne',      number: 24, position: 'Stürmer'     }}),

    // Team 3 – Starfleet
    prisma.player.create({ data: { name: 'James Kirk',         number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Spock Vulkan',       number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Leonard McCoy',      number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Montgomery Scott',   number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Hikaru Sulu',        number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Nyota Uhura',        number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Pavel Chekov',       number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Jean-Luc Picard',    number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'William Riker',      number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Data Android',       number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Deanna Troi',        number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Geordi LaForge',     number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Worf Mogh',          number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Beverly Crusher',    number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Wesley Crusher',     number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Kathryn Janeway',    number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Chakotay Maquis',    number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Tuvok Vulkan',       number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: "B'Elanna Torres",    number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Tom Paris',          number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Harry Kim',          number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Seven of Nine',      number: 24, position: 'Stürmer'     }}),

    // Team 4 – Detectives
    prisma.player.create({ data: { name: 'Sherlock Holmes',    number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'John Watson',        number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Hercule Poirot',     number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Miss Marple',        number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Philip Marlowe',     number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Sam Spade',          number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Columbo Mord',       number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Benoit Blanc',       number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Jessica Fletcher',   number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Adrian Monk',        number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Patrick Jane',       number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Shawn Spencer',      number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Burton Guster',      number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Veronica Mars',      number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Nancy Drew',         number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Hardy Frank',        number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Hardy Joe',          number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Nate Ford',          number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Sophie Devereaux',   number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Eliot Spencer',      number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Parker Diebin',      number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Alec Hardison',      number: 24, position: 'Stürmer'     }}),

    // Team 5 – Heisenberg
    prisma.player.create({ data: { name: 'Walter White',       number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Jesse Pinkman',      number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Saul Goodman',       number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Mike Ehrmantraut',   number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Gustavo Fring',      number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Hank Schrader',      number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Skyler White',       number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Kim Wexler',         number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Jimmy McGill',       number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Nacho Varga',        number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Lalo Salamanca',     number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Tuco Salamanca',     number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Hector Salamanca',   number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Todd Alquist',       number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Jane Margolis',      number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Badger Mayhew',      number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Skinny Pete',        number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Huell Babineaux',    number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Patrick Kuby',       number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Andrea Cantillo',    number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Brock Cantillo',     number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Ed Galbraith',       number: 24, position: 'Stürmer'     }}),

    // Team 6 – Corleones
    prisma.player.create({ data: { name: 'Tony Montana',       number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Vito Corleone',      number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Michael Corleone',   number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Sonny Corleone',     number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Tom Hagen',          number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Fredo Corleone',     number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Connie Corleone',    number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Carlo Rizzi',        number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Luca Brasi',         number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Jack Woltz',         number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Virgil Sollozzo',    number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Peter Clemenza',     number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Sal Tessio',         number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Al Neri',            number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Calo Apulia',        number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Kay Adams',          number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Vincent Mancini',    number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Joey Zasa',          number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Don Altobello',      number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Mary Corleone',      number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Andrew Hagen',       number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Nino Valenti',       number: 24, position: 'Stürmer'     }}),

    // Team 7 – Adventurers
    prisma.player.create({ data: { name: 'Indiana Jones',      number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Marion Ravenwood',   number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Henry Jones Sr',     number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Short Round',        number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Willie Scott',       number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Marcus Brody',       number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Sallah Mohammed',    number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Elsa Schneider',     number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Mutt Williams',      number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Harold Oxley',       number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Belloq René',        number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Walter Donovan',     number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Mola Ram',           number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Irina Spalko',       number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Mac George',         number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Satipo Guide',       number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Toht Arnold',        number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Dietrich Colonel',   number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Jock Lindsey',       number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Kazim Brotherhood',  number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Akator Guard',       number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Dean Stanforth',     number: 24, position: 'Stürmer'     }}),

    // Team 8 – Colonial Marines
    prisma.player.create({ data: { name: 'Ellen Ripley',       number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Dwayne Hicks',       number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Bishop Android',     number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Newt Jordano',       number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Carter Burke',       number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Hudson Drake',       number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Vasquez Jenette',    number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Apone Al',           number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Gorman Scott',       number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Call Annalee',       number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Ash Science',        number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Parker Engineer',    number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Lambert Nav',        number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Dallas Captain',     number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Brett Engineer',     number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Kane XO',            number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Distephano Pvt',     number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Johner Ron',         number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Vriess Cledwyn',     number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Christie Gary',      number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Purvis Leon',        number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'General Perez',      number: 24, position: 'Stürmer'     }}),

    // Team 9 – MI6
    prisma.player.create({ data: { name: 'James Bond',         number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Miss Moneypenny',    number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Q Gadgets',          number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'M Chief',            number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Felix Leiter',       number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Nomi Agent',         number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Vesper Lynd',        number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Honey Ryder',        number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Tracy Draco',        number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Anya Amasova',       number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Ernst Blofeld',      number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Auric Goldfinger',   number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Jaws Steel',         number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Rosa Klebb',         number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Le Chiffre',         number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Silva Raoul',        number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Safin Lyutsifer',    number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Oddjob Henchman',    number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Nick Nack',          number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Zorin Max',          number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Elektra King',       number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Dominic Greene',     number: 24, position: 'Stürmer'     }}),

    // Team 10 – Westeros
    prisma.player.create({ data: { name: 'Tyrion Lannister',   number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Jon Snow',           number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Daenerys Targaryen', number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Cersei Lannister',   number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Jaime Lannister',    number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Ned Stark',          number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Arya Stark',         number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Sansa Stark',        number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Bran Stark',         number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Robb Stark',         number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Joffrey Baratheon',  number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Stannis Baratheon',  number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Melisandre Red',     number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Davos Seaworth',     number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Samwell Tarly',      number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Brienne Tarth',      number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Tormund Giantsbane', number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Sandor Clegane',     number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Gregor Clegane',     number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Petyr Baelish',      number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Varys Spider',       number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Missandei Naath',    number: 24, position: 'Stürmer'     }}),

    // Team 11 – Dunder Mifflin
    prisma.player.create({ data: { name: 'Michael Scott',      number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Dwight Schrute',     number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Jim Halpert',        number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Pam Beesly',         number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Andy Bernard',       number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Kevin Malone',       number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Oscar Martinez',     number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Angela Martin',      number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Stanley Hudson',     number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Phyllis Vance',      number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Ryan Howard',        number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Kelly Kapoor',       number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Toby Flenderson',    number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Creed Bratton',      number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Meredith Palmer',    number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Darryl Philbin',     number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Erin Hannon',        number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Gabe Lewis',         number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Robert California',  number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Todd Packer',        number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Jan Levinson',       number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'David Wallace',      number: 24, position: 'Stürmer'     }}),

    // Team 12 – Hill Valley
    prisma.player.create({ data: { name: 'Marty McFly',        number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Doc Brown',          number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Biff Tannen',        number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'George McFly',       number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Lorraine Baines',    number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Jennifer Parker',    number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Needles Terry',      number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Griff Tannen',       number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Buford Tannen',      number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Clara Clayton',      number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Seamus McFly',       number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Maggie McFly',       number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Dave McFly',         number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Linda McFly',        number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Goldie Wilson',      number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Gerald Strickland',  number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Einstein Dog',       number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Chester Flash',      number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Skinhead Gang',      number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Data Tannen',        number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Spike Tannen',       number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Whitey Tannen',      number: 24, position: 'Stürmer'     }}),

    // Team 13 – Zion
    prisma.player.create({ data: { name: 'Morpheus Zion',      number: 1,  position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Trinity Matrix',     number: 30, position: 'Torhüter'    }}),
    prisma.player.create({ data: { name: 'Neo Anderson',       number: 3,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Agent Smith',        number: 4,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Oracle Matron',      number: 5,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Niobe Zion',         number: 7,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Ghost Zion',         number: 8,  position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Tank Operator',      number: 11, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Dozer Operator',     number: 13, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Apoc Crew',          number: 17, position: 'Verteidiger' }}),
    prisma.player.create({ data: { name: 'Switch Crew',        number: 9,  position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Cypher Reagan',      number: 10, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Mouse Crew',         number: 12, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Persephone Matrix',  number: 14, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Merovingian Boss',   number: 15, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Seraph Guard',       number: 16, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Sati Child',         number: 18, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Rama-Kandra Prog',   number: 19, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Kamala Prog',        number: 21, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Councillor Hamann',  number: 22, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Link Operator',      number: 23, position: 'Stürmer'     }}),
    prisma.player.create({ data: { name: 'Kid Zion',           number: 24, position: 'Stürmer'     }}),
  ]);
  console.log(`✅ ${players.length} Spieler erstellt`);

  // ─── Team-Zuweisungen (je 22 Spieler pro Team, sequenziell) ──────────────
  const assignments: { teamId: number; playerId: number }[] = [];
  for (let t = 0; t < 13; t++) {
    for (let p = 0; p < 22; p++) {
      assignments.push({
        teamId:   teamObjects[t].id,
        playerId: players[t * 22 + p].id,
      });
    }
  }
  await prisma.teamPlayer.createMany({ data: assignments });
  console.log(`✅ ${assignments.length} Team-Zuweisungen erstellt`);

  // ─── Matches ──────────────────────────────────────────────────────────────
  const now = new Date();
  const matchData = [
    { home: 0,  away: 1,  hours: 1,  mode: '3x20' },
    { home: 2,  away: 3,  hours: 3,  mode: '3x20' },
    { home: 4,  away: 5,  hours: 5,  mode: '2x20' },
    { home: 6,  away: 7,  hours: 7,  mode: '3x20' },
    { home: 8,  away: 9,  hours: 9,  mode: '2x20' },
    { home: 10, away: 11, hours: 11, mode: '3x20' },
    { home: 12, away: 0,  hours: 13, mode: '1x24' },
  ] as const;

  await prisma.match.createMany({
    data: matchData.map(m => ({
      homeTeamId:    teamObjects[m.home].id,
      awayTeamId:    teamObjects[m.away].id,
      gameMode:      m.mode,
      phase:         'planned',
      scheduledAt:   new Date(now.getTime() + m.hours * 60 * 60 * 1000),
      currentPeriod: '1',
      timeRemaining: m.mode === '1x24' ? 1440 : 1200,
      running:       false,
      penalties:     [],
    }))
  });
  console.log(`✅ ${matchData.length} Matches erstellt`);

  console.log('\n🎉 Seed abgeschlossen!');
  console.log(`   13 Teams | 286 Spieler | 286 Zuweisungen | 7 Matches`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());