const getDb = require('../utilities/db').getDb;
const mongodb = require('mongodb');

const ObjectId = mongodb.ObjectID;

class User {
    constructor(username, email, cart, id){
        this.name = username;
        this.email = email;
        this.cart = cart; // {items: []}
        this._id = id;

    }

    static findById(userId){
        const db = getDb();

        return db.collection('users').findOne({_id: new ObjectId(userId)})
        .then(user =>{
            return user;
        })
        .catch(error =>{
            console.log('Failed to fetch user by id.');
        });
    }

    addToCart(product) {
        //find the index of the product if the product is already in the cart
        const cartProductIndex = this.cart.items.findIndex(cp =>{
            return cp.productId.toString() === product._id.toString();
        });                           //loo andmebaasi cart ja muuda seda, item ja id, kogus

        let newQty = 1;
        const updatedCartItems = [...this.cart.items];

        if(cartProductIndex >= 0){ //if the product exist update it's qty
            newQty = this.cart.items[cartProductIndex].qty +1;
            updatedCartItems[cartProductIndex].qty = newQty;

        } else { //add the product if it is not in the cart yet
            updatedCartItems.push({productId: new ObjectId(product._id), qty: newQty});
        }

        //save the product to cart and update the database
        const updatedCart = {items: updatedCartItems};
        const db = getDb();
        return db.collection('users').updateOne({_id: new ObjectId(this._id)},
            {$set: {cart:updatedCart}}
        );

    }

    getCart() {
        //return a fully populated cart
        const db = getDb();
        const productIds = this.cart.items.map(i =>{
            return i.productId;
        });

        return db.collection('products').find({_id: {$in: productIds}}).toArray()
        .then(products =>{
            return products.map(p => {
                return {...p, qty: this.cart.items.find(i =>{
                    return i.productId.toString() === p._id.toString();
                }).qty
            };
            });
        });
    }

    deleteItemFromCart(productId){
        const updatedCartItems = this.cart.items.filter(item =>{
            return item.productId.toString() !== productId.toString();
        });

        const db = getDb();
        return db.collection('users').updateOne(
            {_id: new ObjectId(this._id)},
            {$set: {cart: {items: updatedCartItems}}}
        );
    }

    addOrder(){
        const db = getDb();
        return this.getCart()
        .then(products => {
            const order = {
                items: products,
                user: {
                    _id: new ObjectId(this._id),
                    name: this.name,
                    email: this.email
                }
            };

            return db.collection('orders').insertOne(order);
        })
        .then(result => {
            this.cart = { items: [] };
            return db.collection('users')
            .updateOne(
                {_id: new ObjectId(this._id)},
                {$set : {cart: { items: [] }}}
            );
        });
    }

    getOrders() {
        const db = getDb();
        return db.collection('orders').find({'user._id': new ObjectId(this._id)})
        .toArray(); // muudad kõik kasutajaga seotud tellimused massiiviks ja tagastad need
    }

}

module.exports = User;
