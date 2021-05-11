xml.instruct! :xml, :version=>"1.0" 
xml.rss(:version=>"2.0"){
  xml.channel{
    xml.title('Orders')
    xml.link("http://localhost:3001/orders.rss")
    xml.description("description")
    xml.language('en-us')

    for order in @orders
      xml.item do
        xml.title(order.id)
        xml.category()
        xml.description(order.bill_number)
        xml.pubDate(order.created_at.strftime("%a, %d %b %Y %H:%M:%S %z"))
        xml.link("http://localhost:3001/order/" + order.id.to_s)
        xml.guid("http://localhost:3001/order/" + order.id.to_s)
      end
    end
  }
}