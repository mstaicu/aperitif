import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

var mongod = await MongoMemoryServer.create();

await mongoose.connect(mongod.getUri());

/**
 * One - to - many, principle of least cardinality, storing the fk on the "many" side
 */
var personSchema = new mongoose.Schema({
  name: String,
  rankId: mongoose.Types.ObjectId,
});

personSchema.virtual("rank", {
  ref: "Rank",
  localField: "rankId",
  foreignField: "_id",
  justOne: true,
});

var Person = mongoose.model("Person", personSchema);

var rankSchema = new mongoose.Schema({
  name: String,
});

var Rank = mongoose.model("Rank", rankSchema);

var rank1 = new Rank({
  name: "Captain",
});

await rank1.save();

var rank2 = new Rank({
  name: "Lieutenant",
});

await rank2.save();

var me = new Person({
  name: "Mircea",
  rankId: rank1._id,
});

await me.save();

var doc = await Person.findOne({ name: /Mircea/i }).populate("rank");

console.log("Principle of least cardinality");

console.log(doc.rank);

/**
 * One - to - many, storing the fk on the "one" side
 */

var personSchema = new mongoose.Schema({
  name: String,
});

personSchema.virtual("rank", {
  ref: "Rank2",
  localField: "_id",
  foreignField: "peopleIds",
  justOne: true,
});

var Person2 = mongoose.model("Person2", personSchema);

var rankSchema = new mongoose.Schema({
  name: String,
  peopleIds: [mongoose.Types.ObjectId],
});

var Rank2 = mongoose.model("Rank2", rankSchema);

var names = ["Wh", "SS", "Na"];

var people = await Person2.insertMany(
  names.map((name) => ({
    name,
  }))
);

await Rank2.create({
  name: "Captain",
  peopleIds: [people[0]],
});

await Rank2.create({
  name: "Lieutenant",
  peopleIds: [people[1], people[2]],
});

var doc = await Person2.findOne({ name: /SS/i }).populate("rank");

console.log(
  "Non Principle of least cardinality, peopleIds grows without bounds"
);

console.log(doc.rank);

/**
 * Many - to - many, Principle of least cardinality
 */

var characterSchema = new mongoose.Schema({
  name: String,
  showIds: [mongoose.Types.ObjectId],
});

characterSchema.virtual("shows", {
  ref: "Show",
  localField: "showIds",
  foreignField: "_id",
});

var Character = new mongoose.model("Character", characterSchema);

var showSchema = new mongoose.Schema({
  name: String,
});

var Show = new mongoose.model("Show", showSchema);

var shows = await Show.create([
  { name: "Star Trek" },
  { name: "Star Trek: The Next Generation" },
]);

await Character.create([
  { name: "James T. Kirk", showIds: [shows[0]] },
  { name: "Leonard McCoy", showIds: [shows[0], shows[1]] },
]);

var char = await Character.findOne({ name: /McCoy/ }).populate("shows");

console.log("Many - to - many, Principle of least cardinality");

console.log(char.shows);

/**
 * Many - to - many, mapping ( aggregation ) collections
 */

var uSchema = new mongoose.Schema({
  name: String,
});

uSchema.virtual("attended", {
  ref: "Attendee",
  localField: "_id",
  foreignField: "user",
  justOne: false,
  options: {
    populate: "event",
  },
});

var Usr = new mongoose.model("Usr", uSchema);

var Event = new mongoose.model(
  "Event",
  new mongoose.Schema({
    name: String,
  })
);

var Attendee = new mongoose.model(
  "Attendee",
  new mongoose.Schema({
    user: { ref: "Usr", type: mongoose.Types.ObjectId },
    event: { ref: "Event", type: mongoose.Types.ObjectId },
  })
);

var e1 = await Event.create({ name: "Khitomer Conference" });
var e2 = await Event.create({ name: "Enterprise-B Maiden Voyage" });

var users = await Usr.create([{ name: "Kirk" }, { name: "Spock" }]);

await Attendee.create({ event: e1, user: users[0] });
await Attendee.create({ event: e1, user: users[1] });
await Attendee.create({ event: e2, user: users[0] });

var doc = await Usr.findOne({ name: "Kirk" }).populate("attended");

console.log("Many - to - many, mapping collection");
console.log(doc.attended[0]);

/**
 * Close
 */
await mongoose.disconnect();
await mongod.stop();

/**
 * Auth
 */

const { default: mongoose } = await import("mongoose");
const { MongoMemoryServer } = await import("mongodb-memory-server");

var mongod = await MongoMemoryServer.create();
await mongoose.connect(mongod.getUri());

var challengeSchema = new mongoose.Schema({
  content: {
    type: String,
    /**
     * 32 characters in base64 represent 192 bits (32 * 6 = 192 bits)
     */
    default: "WTF",
    unique: true,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

challengeSchema.index({ createdAt: 1 }, { expireAfterSeconds: 5 });

var Challenge = mongoose.model("Challenge", challengeSchema);

var c = new Challenge();

await c.save();

await Challenge.find({});
