public class Card {
    
    private char suit;
    private int face = -1;
    public final static String SUITS = "SHDC";
    
    public Card(char suit, int face) {
        if (SUITS.indexOf(suit) < 0) {
            throw new IllegalArgumentException("Illegal suit: " + suit);
        }
        if (face < 1 || face > 13) {
            throw new IllegalArgumentException("Illegal face: " + face);
        }
        this.suit = suit;
        this.face = face;
    }
    
    public String toString() {
        $parson{CardToString};
    }

    public char getSuit() {
        return this.suit;
    }
    
    public int getFace() {
        return this.face;
    }
}
