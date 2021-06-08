import java.util.ArrayList;
import java.util.List;
import java.util.Arrays;

public class StockIndex implements StockListener {
/*$parson{
    "text": "implements StockListener",
    "width": 48,
    "type": "write"
}*/
	
	private List<Stock> stocks = new ArrayList<>();
	private double index = 0;

	public StockIndex(String name, Stock... stocks) {
		this.stocks.addAll(List.of(stocks));
		for (Stock s : stocks) {
			s.addStockListener(this);
            /*$parson{
                "text": "s.addStockListener(this)",
                "width": 50,
                "type": "dragdrop"
            }*/
			this.index += s.getPrice();
            /*$parson{
                "text": "this.index += s.getPrice()",
                "width": 50,
                "type": "dragdrop"
            }*/
		}
	}
	
	@Override
    /*$parson{
        "text": "@Override",
        "width": 18,
        "type": "dropdown",
        "dropdown": "annotation"
    }*/
	public void stockPriceChanged(Stock stock, double oldPrice, double newPrice) {
    /*$parson{
        "text": "Stock stock",
        "width": 22,
        "type": "dragdrop"
    }*/
    /*$parson{
        "text": "double oldPrice",
        "width": 30,
        "type": "dragdrop"
    }*/
    /*$parson{
        "text": "double newPrice",
        "width": 30,
        "type": "dragdrop"
    }*/
		this.index += newPrice - oldPrice;
	}
	
	public static void main(String[] args){
        Stock tesla = new Stock("TSLA", 100.0);
        Stock apple = new Stock("AAPL", 200,0);
        StockIndex stockIndex = new StockIndex(tesla, apple);
        // should print 300.0
        System.out.println(stockIndex.index);
        tesla.setPrice(110.0);
        // should print 310.0
        System.out.println(stockIndex.index);
    }
}
