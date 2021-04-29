import java.util.ArrayList;

public class CardDeck {
    
    private ArrayList<Card> cards;

    public CardDeck(int suitSize) {
        cards = new ArrayList<Card>();
        for (int i = 0; i < Card.SUITS.length(); i++) {
            for (int face = 1; face <= suitSize; face++) {
                Card card = new Card(Card.SUITS.charAt(i), face);
                cards.add(card);
            }
        }
    }

    @Override
    public String toString() {
        $parson{CardDeckToString};
    }

    public int getCardCount() {
        return $parson{cardCount};
    }
    
    public Card getCard(int i) {
        if (i < 0 || i >= getCardCount()) {
            throw new IllegalArgumentException(String.format("%s is an illegal card index, when the size of the deck is %s", i, getCardCount()));
        }
        return $parson{getCard};
    }
    
    public void shufflePerfectly() {
        int halfSize = cards.size() / 2;
        for (int i = 0; i < halfSize; i++) {
            Card card = cards.remove(halfSize + i);
            cards.add(i * 2 + 1, card);
        }
    }
}
